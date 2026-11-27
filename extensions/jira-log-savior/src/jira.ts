import { dateKey, monthStart, shiftDay } from "./calendar";

export type JiraSettings = { site: string; email: string; token: string };
type Issue = { id: string; key: string; fields: { summary: string } };
type Worklog = { author: { accountId: string }; started: string; timeSpentSeconds: number };

export type Task = { key: string; summary: string; seconds: number };
export type CalendarData = Map<string, Task[]>;

export function siteOrigin(input: string): string {
  const value = input.trim();
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9-]+\.atlassian\.net$/.test(url.hostname) ||
    url.port || url.username || url.password || url.pathname !== "/" || url.search || url.hash
  ) {
    throw new Error("Enter the Jira Cloud site URL, like https://example.atlassian.net.");
  }
  return url.origin;
}

export async function loadMonth(settings: JiraSettings, month: Date, signal: AbortSignal): Promise<CalendarData> {
  const origin = siteOrigin(settings.site);
  const authorization = "Basic " + Buffer.from(`${settings.email.trim()}:${settings.token.trim()}`).toString("base64");

  async function request<T>(path: string, body?: object): Promise<T> {
    const response = await fetch(`${origin}/rest/api/3${path}`, {
      method: body ? "POST" : "GET",
      body: body ? JSON.stringify(body) : undefined,
      headers: { Authorization: authorization, Accept: "application/json", "Content-Type": "application/json" },
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error("Jira rejected the credentials. Check your email and API token.");
      if (response.status === 403) throw new Error("Jira denied access. Check your account permissions and API token.");
      if (response.status === 429) throw new Error("Jira rate limited this request. Wait a moment, then refresh.");
      throw new Error(`Jira returned HTTP ${response.status}.`);
    }
    return await response.json() as T;
  }

  const { accountId } = await request<{ accountId: string }>("/myself");
  if (!accountId) throw new Error("Jira did not return an account ID.");

  const start = monthStart(month);
  const end = monthStart(month, 1);
  // Pad the JQL window for Jira's date indexing and timezone differences.
  const jql = `worklogAuthor = currentUser() AND worklogDate >= "${dateKey(shiftDay(start, -2))}" AND worklogDate < "${dateKey(shiftDay(end, 2))}"`;
  const issues = new Map<string, Issue>();
  const seenTokens = new Set<string>();
  let nextPageToken: string | undefined;
  do {
    const page: { issues: Issue[]; nextPageToken?: string; isLast?: boolean } = await request("/search/jql", {
      jql, fields: ["summary"], maxResults: 100, nextPageToken,
    });
    for (const issue of page.issues) issues.set(issue.id, issue);
    nextPageToken = page.isLast ? undefined : page.nextPageToken;
    if (page.isLast === false && !nextPageToken) throw new Error("Jira search did not return its next page.");
    if (nextPageToken) {
      if (seenTokens.has(nextPageToken)) throw new Error("Jira returned a repeated search page.");
      seenTokens.add(nextPageToken);
    }
  } while (nextPageToken);

  const days: CalendarData = new Map();
  const pending = Array.from(issues.values());
  async function readIssues() {
    for (let issue = pending.pop(); issue; issue = pending.pop()) {
      const issueTotals = new Map<string, number>();
      let offset = 0;
      while (true) {
        const query = new URLSearchParams({
          startAt: String(offset), maxResults: "100",
          startedAfter: String(start.getTime() - 1), startedBefore: String(end.getTime()),
        });
        const page = await request<{ total: number; worklogs: Worklog[] }>(
          `/issue/${encodeURIComponent(issue.id)}/worklog?${query}`,
        );
        for (const log of page.worklogs) {
          if (log.author.accountId !== accountId) continue;
          const started = new Date(log.started.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
          if (!(started >= start && started < end)) continue;
          const key = dateKey(started);
          issueTotals.set(key, (issueTotals.get(key) ?? 0) + log.timeSpentSeconds);
        }
        offset += page.worklogs.length;
        if (offset >= page.total) break;
        if (!page.worklogs.length) throw new Error("Jira returned an incomplete worklog page.");
      }
      for (const [day, seconds] of issueTotals) {
        const tasks = days.get(day) ?? [];
        tasks.push({ key: issue.key, summary: issue.fields.summary, seconds });
        days.set(day, tasks);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, readIssues));
  for (const tasks of days.values()) tasks.sort((a, b) => b.seconds - a.seconds || a.key.localeCompare(b.key));
  return days;
}
