import { ReducedIssue, ReducedUser, Youtrack } from "youtrack-rest-client";
import { LocalStorage } from "@raycast/api";
import { Issue, IssueExtended, User } from "./interfaces";

const YT_CACHE_KEY = "youtrack-issues";

export function getEmptyIssue(): Issue {
  return {
    id: "",
    summary: "Connecting to YouTrack...",
    date: "",
    created: "",
    resolved: false,
  };
}

function issueToItem(issue: ReducedIssue): Issue {
  return {
    id: `${issue.project?.shortName}-${issue.numberInProject}`,
    summary: issue.summary ?? "Unable to load issue summary",
    date: new Date(issue.updated ?? 0).toDateString(),
    created: new Date(issue.created ?? 0).toDateString(),
    resolved: !!issue.resolved,
    description: issue.description,
  };
}

async function getUserAvatarUrl(userId: string, yt: Youtrack): Promise<string | undefined> {
  const { avatarUrl } = await yt.users.byId(userId);
  return avatarUrl ?? "";
}

async function reducedUserToUser(user: ReducedUser, yt: Youtrack): Promise<User> {
  return {
    id: user.id,
    name: user.name,
    fullName: user.fullName,
    avatarUrl: await getUserAvatarUrl(user.id, yt),
  };
}

export async function fetchIssues(query: string, limit: number, yt: Youtrack): Promise<Issue[]> {
  const data = await yt.issues.search(query, { $top: limit });
  return data.map(issueToItem);
}

function formatDate(dateString: number): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "medium" }).format(date);
}

export async function fetchIssueDetails(issue: Issue, yt: Youtrack): Promise<IssueExtended> {
  const { reporter, updater, tags, created, updated } = await yt.issues.byId(issue.id);
  return {
    ...issue,
    date: formatDate(updated ?? 0),
    created: formatDate(created ?? 0),
    reporter: reporter && (await reducedUserToUser(reporter, yt)),
    updater: updater && (await reducedUserToUser(updater, yt)),
    tags,
  };
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

export function isURL(s: string) {
  try {
    new URL(s);
    return true;
  } catch (_) {
    return false;
  }
}

export function removeMarkdownImages(issueBody: string) {
  const imagePattern = /!\[[^\]]*\]\([^)]+\){[^}]*}|!\[]\([^)]+\)/g;
  return issueBody.replace(imagePattern, "");
}
