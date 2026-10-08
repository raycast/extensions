import { getPreferenceValues } from "@raycast/api";
import { parseDate, formatDateKey } from "./utils";
import { jiraRequest } from "./requests";
import { issuesValidator, paginationValidator, projectsValidator, worklogsValidator } from "./validators";
import { Preferences, Issue, Project, Worklog, WorklogEntry } from "./types";
const getApiPath = (path: string) =>
  `/rest/api/${getPreferenceValues<Preferences>().isJiraCloud === "cloud" ? "3" : "2"}${path}`;
function nextOffset(body: { startAt: number; total: number }, count: number): string | undefined {
  const next = body.startAt + count;
  if (next >= body.total) return undefined;
  if (!count) throw new Error("Jira returned an empty page before all results were loaded.");
  return String(next);
}
export const getProjects = async (begin = 0): Promise<{ data: Project[]; nextPageToken?: string }> => {
  const isCloud = getPreferenceValues<Preferences>().isJiraCloud === "cloud";
  const response = await jiraRequest(
    getApiPath(isCloud ? `/project/search?maxResults=100&startAt=${begin}` : "/project"),
  );
  if (!projectsValidator(response)) throw new Error("Jira returned an invalid project response.");
  if (Array.isArray(response)) return { data: response };
  return {
    data: response.values,
    nextPageToken: response.isLast ? undefined : nextOffset(response, response.values.length),
  };
};
// Preserve custom sorting while combining its filter with the selected project.
function issueJql(projectId: string, customJQL = ""): string {
  let quote = "";
  let filter = customJQL.trim();
  let order = "ORDER BY key ASC";
  for (let i = 0; i < filter.length; i++) {
    if (filter[i] === "\\") {
      i++;
      continue;
    }
    if (quote) {
      if (filter[i] === quote) quote = "";
      continue;
    }
    if (filter[i] === "'" || filter[i] === '"') {
      quote = filter[i];
      continue;
    }
    const match = (i === 0 || /\s/.test(filter[i - 1])) && filter.slice(i).match(/^ORDER\s+BY\s+/i);
    if (match) {
      order = filter.slice(i);
      filter = filter.slice(0, i).trim();
      break;
    }
  }
  const project = `project = "${projectId.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return `${project}${filter ? ` AND (${filter})` : ""} ${order}`;
}
const searchIssues = async (jql: string, token?: string): Promise<{ data: Issue[]; nextPageToken?: string }> => {
  const isCloud = getPreferenceValues<Preferences>().isJiraCloud === "cloud";
  const response = isCloud
    ? await jiraRequest(
        getApiPath("/search/jql"),
        JSON.stringify({
          jql,
          fields: ["summary", "project"],
          maxResults: 100,
          ...(token ? { nextPageToken: token } : {}),
        }),
        "POST",
      )
    : await jiraRequest(
        getApiPath(
          `/search?jql=${encodeURIComponent(jql)}&fields=summary,project&maxResults=100&startAt=${token || "0"}`,
        ),
      );
  if (!issuesValidator(response)) throw new Error("Jira returned an invalid issue response.");
  if (isCloud) {
    if (response.isLast === false && !response.nextPageToken)
      throw new Error("Jira did not return the next search page token.");
    return { data: response.issues, nextPageToken: response.isLast ? undefined : response.nextPageToken || undefined };
  }
  if (!paginationValidator(response)) throw new Error("Jira returned invalid search pagination.");
  return { data: response.issues, nextPageToken: nextOffset(response, response.issues.length) };
};
export const getIssues = (token: string | undefined, projectId: string) =>
  searchIssues(issueJql(projectId, getPreferenceValues<Preferences>().customJQL), token);
export async function loadAllPages<T>(
  load: (token?: string) => Promise<{ data: T[]; nextPageToken?: string }>,
): Promise<T[]> {
  const results: T[] = [];
  const seenTokens = new Set<string>();
  let token: string | undefined;
  do {
    const page = await load(token);
    results.push(...page.data);
    token = page.nextPageToken;
    if (token && seenTokens.has(token)) throw new Error("Jira returned a repeated pagination token.");
    if (token) seenTokens.add(token);
  } while (token);
  return results;
}
const worklogBody = (seconds: number, description: string | undefined, startedAt: Date) => {
  if (!Number.isSafeInteger(seconds) || seconds <= 0) throw new Error("Please enter a valid time.");
  const isCloud = getPreferenceValues<Preferences>().isJiraCloud === "cloud";
  const comment =
    isCloud && typeof description === "string"
      ? {
          type: "doc",
          version: 1,
          content: description
            ? description.split("\n").map((line) => ({
                type: "paragraph",
                ...(line ? { content: [{ type: "text", text: line }] } : {}),
              }))
            : [{ type: "paragraph" }],
        }
      : description;
  return JSON.stringify({
    timeSpentSeconds: seconds,
    ...(comment !== undefined ? { comment } : {}),
    started: parseDate(startedAt),
  });
};
export const postTimeLog = (seconds: number, issueId: string, description: string, startedAt: Date) =>
  jiraRequest(
    getApiPath(`/issue/${encodeURIComponent(issueId)}/worklog?notifyUsers=false`),
    worklogBody(seconds, description || undefined, startedAt),
    "POST",
  );
// Omit the comment on time/date-only edits to preserve Jira's original rich text.
export const updateWorklog = (
  issueId: string,
  worklogId: string,
  seconds: number,
  description: string | undefined,
  startedAt: Date,
) =>
  jiraRequest(
    getApiPath(`/issue/${encodeURIComponent(issueId)}/worklog/${encodeURIComponent(worklogId)}?notifyUsers=false`),
    worklogBody(seconds, description, startedAt),
    "PUT",
  );
export const deleteWorklog = (issueId: string, worklogId: string) =>
  jiraRequest(
    getApiPath(`/issue/${encodeURIComponent(issueId)}/worklog/${encodeURIComponent(worklogId)}?notifyUsers=false`),
    undefined,
    "DELETE",
  );
const getCurrentUserId = async (): Promise<string> => {
  const response = await jiraRequest(getApiPath("/myself"));
  const key = getPreferenceValues<Preferences>().isJiraCloud === "cloud" ? "accountId" : "name";
  if (typeof response !== "object" || response === null || !(key in response))
    throw new Error("Jira did not identify the current user.");
  const id = (response as Record<string, unknown>)[key];
  if (typeof id !== "string" || !id) throw new Error("Jira did not identify the current user.");
  return id;
};
export const getWorklogs = async (startDate: Date, endDate: Date): Promise<WorklogEntry[]> => {
  // JQL dates use Jira's timezone; widen discovery, then filter exact local bounds.
  const searchStart = new Date(startDate);
  searchStart.setDate(searchStart.getDate() - 1);
  const searchEnd = new Date(endDate);
  searchEnd.setDate(searchEnd.getDate() + 1);
  const jql = `worklogDate >= "${formatDateKey(searchStart)}" AND worklogDate <= "${formatDateKey(searchEnd)}" AND worklogAuthor = currentUser()`;
  const currentUserId = await getCurrentUserId();
  const issues = await loadAllPages((token) => searchIssues(jql, token));
  const uniqueIssues = Array.from(new Map(issues.map((issue) => [issue.key, issue])).values());
  const entries: WorklogEntry[] = [];
  let nextIssue = 0;
  const worker = async () => {
    while (nextIssue < uniqueIssues.length) {
      const issue = uniqueIssues[nextIssue++];
      const worklogs = await loadAllPages<Worklog>(async (token) => {
        const response = await jiraRequest(
          getApiPath(`/issue/${encodeURIComponent(issue.key)}/worklog?maxResults=100&startAt=${token || "0"}`),
        );
        if (!worklogsValidator(response)) throw new Error(`Jira returned invalid worklogs for ${issue.key}.`);
        return { data: response.worklogs, nextPageToken: nextOffset(response, response.worklogs.length) };
      });
      for (const worklog of new Map(worklogs.map((log) => [log.id, log])).values()) {
        const authorId =
          getPreferenceValues<Preferences>().isJiraCloud === "cloud" ? worklog.author.accountId : worklog.author.name;
        const date = new Date(worklog.started);
        if (authorId === currentUserId && date >= startDate && date <= endDate) {
          entries.push({
            worklog,
            issue: {
              key: issue.key,
              summary: issue.fields.summary,
              project: issue.fields.project || { key: "", name: "" },
            },
          });
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, uniqueIssues.length) }, worker));
  return entries.sort((a, b) => new Date(b.worklog.started).getTime() - new Date(a.worklog.started).getTime());
};
