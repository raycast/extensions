export interface SafariTab {
  url: string;
  title: string;
}

export interface JiraIssue {
  key: string;
  summary: string;
  url: string;
  description: string;
}

const ISSUE_KEY = /^[A-Z][A-Z0-9_]*-[1-9]\d*$/i;

function normalizeHost(input: string): string {
  const value = input.trim();
  const parsed = new URL(value.includes("://") ? value : `https://${value}`);
  if (parsed.username || parsed.password || parsed.port || !parsed.hostname) {
    throw new Error("Jira domains must be hostnames, without credentials or ports.");
  }
  return parsed.hostname.toLowerCase();
}

export function decodeSafariTab(output: string): SafariTab {
  let value: unknown;
  try {
    value = JSON.parse(output);
  } catch {
    throw new Error("Safari did not return a readable tab. Try the command again after the page finishes loading.");
  }
  if (
    !value ||
    typeof value !== "object" ||
    !("url" in value) ||
    typeof value.url !== "string" ||
    !("title" in value) ||
    typeof value.title !== "string"
  ) {
    throw new Error("Safari's current tab has no readable address or title.");
  }
  return { url: value.url, title: value.title };
}

function cleanSummary(title: string, key: string): string {
  const text = title
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+[-|–—]\s+(?:Atlassian\s+)?Jira(?:\s+Software)?$/i, "");
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const leadingKey = new RegExp(`^\\[?${escaped}\\]?(?:\\s*[-:|–—]\\s*|\\s+)`, "i");
  const trailingKey = new RegExp(`\\s+[-|–—]\\s+\\[?${escaped}\\]?$`, "i");
  // Board titles often contain no ticket title. Never label a board as the issue summary.
  if (leadingKey.test(text)) return text.replace(leadingKey, "").trim().slice(0, 500);
  if (trailingKey.test(text)) return text.replace(trailingKey, "").trim().slice(0, 500);
  return "";
}

export function extractJiraIssue(tab: SafariTab, allowedDomains = ""): JiraIssue {
  let parsed: URL;
  try {
    parsed = new URL(tab.url);
  } catch {
    throw new Error("Open a Jira ticket in the frontmost Safari window first.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) {
    throw new Error("The current Safari tab must be an HTTPS Jira ticket without credentials in its address.");
  }

  const domains = allowedDomains
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(normalizeHost);
  const isAllowed = domains.length
    ? domains.includes(parsed.hostname.toLowerCase())
    : parsed.hostname.toLowerCase().endsWith(".atlassian.net");
  if (!isAllowed) {
    throw new Error(
      "This is not an allowed Jira domain. Open your Jira ticket or add its hostname in this command's settings.",
    );
  }

  const browse = parsed.pathname.match(/^(.*?)\/browse\/([^/]+)\/?$/i);
  const isIssueView =
    browse !== null ||
    /(?:^|\/)jira\/(?:software|core|servicedesk|issues)(?:\/|$)/i.test(parsed.pathname) ||
    /\/secure\/(?:RapidBoard|IssueNavigator|Dashboard)\.jspa$/i.test(parsed.pathname) ||
    /\/issues\/?$/i.test(parsed.pathname);
  if (!isIssueView) throw new Error("Open a Jira ticket or select a ticket on a Jira board first.");

  const selected = [...parsed.searchParams.getAll("selectedIssue"), ...parsed.searchParams.getAll("issueKey")];
  let directKey = "";
  try {
    directKey = browse ? decodeURIComponent(browse[2]) : "";
  } catch {
    throw new Error("The Jira ticket address is malformed. Open the ticket's full page and try again.");
  }
  const candidates = selected.length ? selected : directKey ? [directKey] : [];
  if (!candidates.length || candidates.some((value) => !ISSUE_KEY.test(value))) {
    throw new Error(
      "The current address does not identify one Jira ticket. Open the ticket's full page and try again.",
    );
  }
  const uniqueKeys = [...new Set(candidates.map((value) => value.toUpperCase()))];
  if (uniqueKeys.length !== 1)
    throw new Error("This address refers to more than one Jira ticket. Open one ticket's full page first.");
  const key = uniqueKeys[0];

  // Keep a self-hosted Jira context path, but drop board filters, sessions, and tracking parameters.
  const secureContext = parsed.pathname.match(/^(.*?)\/secure\//i)?.[1];
  const jiraContext = parsed.pathname.match(/^(.*?)\/jira\//i)?.[1];
  const issueContext = parsed.pathname.match(/^(.*?)\/issues\/?$/i)?.[1];
  const context = parsed.hostname.endsWith(".atlassian.net")
    ? ""
    : (browse?.[1] ?? secureContext ?? jiraContext ?? issueContext ?? "");
  const url = new URL(`${context}/browse/${key}`, parsed.origin).href;
  const summary = cleanSummary(tab.title, key);
  const description = `#${key}${summary ? ` ${summary}` : ""}`;
  return { key, summary, url, description };
}

// MOCO uses these native fields to link the ticket, just like its browser extension.
export function jiraActivityLink(issue: JiraIssue) {
  return { remote_service: "jira", remote_id: issue.key, remote_url: issue.url };
}

export interface JiraActivityReference {
  remote_service?: string | null;
  remote_id?: string | null;
  remote_url?: string | null;
  description?: string | null;
}

export function matchesJiraActivity(issue: JiraIssue, activity: JiraActivityReference): boolean {
  const host = new URL(issue.url).hostname;
  const matchesUrl = (url: string): boolean => {
    try {
      return extractJiraIssue({ url, title: "" }, host).url === issue.url;
    } catch {
      return false;
    }
  };
  // Native linkage is authoritative. Never count a different ticket merely mentioned in its description.
  if (activity.remote_service && activity.remote_service.toLowerCase() !== "jira") return false;
  if (activity.remote_id && activity.remote_id.toUpperCase() !== issue.key) return false;
  if (activity.remote_url) return matchesUrl(activity.remote_url);
  if (activity.remote_service || activity.remote_id) return false; // No site identity: the key alone is ambiguous.

  // Early versions of this fork put the canonical URL in the description instead of native metadata.
  const urls = activity.description?.match(/https:\/\/[^\s<>"'`]+/gi) ?? [];
  return urls.some((url) => matchesUrl(url.replace(/[.,;!?)\]]+$/, "")));
}
