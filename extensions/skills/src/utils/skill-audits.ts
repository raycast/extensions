import {
  buildGithubIssueUrl,
  SKILLS_BASE_URL,
  type AuditProvider,
  type AuditStatus,
  type Skill,
  type SkillAudit,
} from "../shared";

export type SkillAuditsAvailabilityState = "available" | "not-available" | "fetch-error" | "parse-error";

export type SkillAuditErrorKind = "parse" | "network" | "http" | "body-read";

export type SkillAuditErrorDetails = {
  kind: SkillAuditErrorKind;
  title: "Unable to fetch security audits data" | "Unable to parse security audits data";
  message: string;
  skillSource: string;
  skillId: string;
  detailUrl: string;
  timestamp: string;
};

export type SkillAuditsResult = {
  audits: SkillAudit[];
  availabilityState: SkillAuditsAvailabilityState;
  errorDetails?: SkillAuditErrorDetails;
};

const KNOWN_PROVIDERS = new Set<AuditProvider>(["agent-trust-hub", "socket", "snyk"]);

function isKnownProvider(slug: string): slug is AuditProvider {
  return KNOWN_PROVIDERS.has(slug as AuditProvider);
}

const PROVIDER_ORDER: AuditProvider[] = ["agent-trust-hub", "socket", "snyk"];

function buildAuditErrorResult({
  skill,
  kind,
  title,
  message,
}: {
  skill: Skill;
  kind: SkillAuditErrorKind;
  title: SkillAuditErrorDetails["title"];
  message: string;
}): SkillAuditsResult {
  return {
    audits: [],
    availabilityState: kind === "parse" ? "parse-error" : "fetch-error",
    errorDetails: {
      kind,
      title,
      message,
      skillSource: skill.source,
      skillId: skill.skillId,
      detailUrl: `${SKILLS_BASE_URL}/${skill.source}/${skill.skillId}`,
      timestamp: new Date().toISOString(),
    },
  };
}

function buildAuditFetchErrorResult({
  skill,
  kind,
  message,
}: {
  skill: Skill;
  kind: Exclude<SkillAuditErrorKind, "parse">;
  message: string;
}): SkillAuditsResult {
  return buildAuditErrorResult({ skill, kind, title: "Unable to fetch security audits data", message });
}

function buildAuditParseErrorResult(skill: Skill, message: string): SkillAuditsResult {
  return buildAuditErrorResult({ skill, kind: "parse", title: "Unable to parse security audits data", message });
}

export function formatSkillAuditErrorDetails({
  skillName,
  errorDetails,
}: {
  skillName: string;
  errorDetails: SkillAuditErrorDetails;
}): string {
  return [
    errorDetails.title,
    `Skill: ${skillName}`,
    `Source: ${errorDetails.skillSource}/${errorDetails.skillId}`,
    `Failure kind: ${errorDetails.kind}`,
    `Message: ${errorDetails.message}`,
    `URL: ${errorDetails.detailUrl}`,
    `Time: ${errorDetails.timestamp}`,
  ].join("\n");
}

export function buildSecurityAuditGitHubIssueUrl({
  error,
  errorDetails,
  skillName,
}: {
  error: Error;
  errorDetails: SkillAuditErrorDetails;
  skillName: string;
}): string {
  return buildGithubIssueUrl({
    title: `${errorDetails.title}: ${skillName}`,
    description: `Failed to verify the security audit data for skill: ${skillName}\n\nAudit Error Details:\n\n\`\`\`\n${formatSkillAuditErrorDetails({ skillName, errorDetails })}\n\`\`\`\n`,
    error,
    reproductionSteps: [
      "Open Raycast and run the 'Search Skills' command.",
      "Wait for the security audits to load in the details view of the skill.",
      "Observe the resulting error.",
    ],
  });
}

/**
 * Normalizes the URL of an audit entry.
 *
 * @param href - The URL of an audit entry.
 * @returns The normalized URL of the audit entry.
 */
function normalizeSecurityAuditUrl(href: string): string | undefined {
  if (href.startsWith("https://") || href.startsWith("http://")) {
    return href;
  }
  if (href.startsWith("/")) {
    return `${SKILLS_BASE_URL}${href}`;
  }
  return undefined;
}

/**
 * Parses the status of a security audit from the HTML of an audit entry.
 *
 * @param entryHtml - The HTML of an audit entry.
 * @returns The status of the security audit.
 */
function parseAuditStatusFromEntryHtml(entryHtml: string): AuditStatus {
  const auditStatus = entryHtml.match(/\b(Pass|Warn|Fail)\b/i)?.[1]?.toLowerCase();
  if (auditStatus === "pass") return "pass";
  if (auditStatus === "warn") return "warn";
  if (auditStatus === "fail") return "fail";
  return "unknown";
}

/**
 * Extracts the main content from the HTML content of a page.
 *
 * @param html - The HTML to extract the main content from.
 * @returns The main content of the HTML.
 */
function extractMainContentFromHtml(html: string): string | undefined {
  const lower = html.toLowerCase();
  const mainStartIndex = lower.indexOf("<main");
  if (mainStartIndex < 0) return undefined;

  const contentStartIndex = lower.indexOf(">", mainStartIndex);
  if (contentStartIndex < 0) return undefined;

  const mainEndIndex = lower.indexOf("</main>", contentStartIndex);
  if (mainEndIndex < 0) return undefined;

  return html.slice(contentStartIndex + 1, mainEndIndex);
}

/**
 * Extracts the security audit section from the HTML content of the skill's details page.
 *
 * @param mainHtml - The HTML of the skill's details page.
 * @returns The security audit section of the HTML of the skill's details page.
 */
function extractSecurityAuditSection(mainHtml: string): string | undefined {
  const lower = mainHtml.toLowerCase();
  const sectionStartIndex = lower.indexOf("security audits");
  if (sectionStartIndex < 0) return undefined;

  const sectionHtml = mainHtml.slice(sectionStartIndex);
  const sectionLower = sectionHtml.toLowerCase();

  // NOTE: "installed on" marks the start of the installs section that follows security audits on skills.sh
  // and marks the end of the security audits section. This is a heuristic boundary — update if the page structure changes.
  const sectionBoundaryIndex = sectionLower.indexOf("installed on");
  return sectionBoundaryIndex >= 0 ? sectionHtml.slice(0, sectionBoundaryIndex) : sectionHtml;
}

/**
 * Parses the security audits from the HTML of the skill's details page.
 *
 * @param html - The HTML of the skill's details page.
 * @returns The security audits from the HTML of the skill's details page.
 */
function parseSecurityAuditsFromHtml(skill: Skill, html: string): SkillAuditsResult {
  if (!html.trim()) {
    return buildAuditParseErrorResult(skill, "Invalid HTML");
  }

  try {
    const mainContent = extractMainContentFromHtml(html);
    if (!mainContent) {
      return buildAuditParseErrorResult(skill, "The skill page content could not be parsed.");
    }

    const sectionHtml = extractSecurityAuditSection(mainContent);
    if (!sectionHtml?.trim()) {
      return { audits: [], availabilityState: "not-available", errorDetails: undefined };
    }

    const parsedAudits: SkillAudit[] = [];
    const auditEntryAnchorRegExp =
      /<a[^>]*href="(?<href>[^"]*\/security\/(?<slug>[^"/?#]+)[^"]*)"[^>]*>(?<entryHtml>[\s\S]*?)<\/a>/gi;
    for (const match of sectionHtml.matchAll(auditEntryAnchorRegExp)) {
      const href = match.groups?.href;
      const slug = match.groups?.slug?.toLowerCase();
      const entryHtml = match.groups?.entryHtml;

      if (!href || !slug || !entryHtml) continue;
      if (!isKnownProvider(slug)) continue;
      const provider = slug;

      const audit: SkillAudit = {
        provider,
        status: parseAuditStatusFromEntryHtml(entryHtml),
        url: normalizeSecurityAuditUrl(href),
      };

      const existingAuditIndex = parsedAudits.findIndex((existingAudit) => existingAudit.provider === provider);
      if (existingAuditIndex >= 0) {
        parsedAudits[existingAuditIndex] = audit;
      } else {
        parsedAudits.push(audit);
      }
    }

    const audits = PROVIDER_ORDER.map((provider) => parsedAudits.find((audit) => audit.provider === provider)).filter(
      (audit): audit is SkillAudit => Boolean(audit),
    );

    if (audits.length > 0) {
      return { audits, availabilityState: "available", errorDetails: undefined };
    }

    const hasSecurityLinkRegExp = /<a[^>]*href="[^"]*\/security\/[^"]*"[^>]*>/i;
    if (hasSecurityLinkRegExp.test(sectionHtml)) {
      return buildAuditParseErrorResult(skill, "The security audit data could not be parsed reliably.");
    }

    return {
      audits: [],
      availabilityState: "not-available",
      errorDetails: undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildAuditParseErrorResult(skill, `Extraction failed: ${message}`);
  }
}

/**
 * Fetches the security audits for a skill from the Skills website.
 *
 * @param skill - The skill to fetch the security audits for.
 * @returns The security audits for the skill.
 */
export async function fetchSkillAudits(skill: Skill): Promise<SkillAuditsResult> {
  const detailUrl = `${SKILLS_BASE_URL}/${skill.source}/${skill.skillId}`;
  const timeoutSignal = typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(10_000) : undefined;

  let response: Response;
  try {
    response = await fetch(detailUrl, { signal: timeoutSignal });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildAuditFetchErrorResult({
      skill,
      kind: "network",
      message,
    });
  }

  if (!response.ok) {
    return buildAuditFetchErrorResult({
      skill,
      kind: "http",
      message: `HTTP ${response.status}`,
    });
  }

  let body: string;
  try {
    body = await response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildAuditFetchErrorResult({
      skill,
      kind: "body-read",
      message,
    });
  }

  return parseSecurityAuditsFromHtml(skill, body);
}
