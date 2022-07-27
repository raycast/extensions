import { ReducedIssue, Youtrack } from "youtrack-rest-client";
import { LocalStorage } from "@raycast/api";
import { Issue } from "./interfaces";

const YT_CACHE_KEY = "youtrack-issues";

export function getEmptyIssue(): Issue {
  return {
    id: "",
    summary: "Connecting to YouTrack...",
    date: "",
    resolved: false,
  };
}

function issueToItem(issue: ReducedIssue): Issue {
  return {
    id: `${issue.project?.shortName}-${issue.numberInProject}`,
    summary: issue.summary ?? "Unable to load issue summary",
    date: new Date(issue.updated ?? 0).toDateString(),
    resolved: !!issue.resolved,
  };
}

export async function fetchIssues(query: string, limit: number, yt: Youtrack): Promise<Issue[]> {
  const data = await yt.issues.search(query, { $top: limit });
  return data.map(issueToItem);
}

export async function saveCache(issues: Issue[]): Promise<void> {
  await LocalStorage.setItem(YT_CACHE_KEY, JSON.stringify(issues));
}

export async function loadCache(): Promise<Issue[]> {
  const data = (await LocalStorage.getItem(YT_CACHE_KEY)) as string;
  return JSON.parse(data ?? "[]") as Issue[];
}

export const issueStates = {
  ISSUE_RESOLVED: "Resolved",
  ISSUE_OPEN: "Open",
};
