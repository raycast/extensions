import {
  IssueImpl,
  IssueTag,
  NewIssue,
  ReducedIssue,
  ReducedProject,
  ReducedUser,
  WorkItem,
  Youtrack,
} from "youtrack-rest-client";
import { Issue, IssueExtended, Project, User } from "./interfaces";
import { IssueCustomFieldValue } from "youtrack-rest-client/dist/entities/issueCustomField";

type PreparedFavorites = { cached: Project[]; toFetch: string[] };
type FetchedFavorites = { fetched: Project[]; errored: string[] };

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

function prepareProject(project: ReducedProject): Project {
  return {
    id: project.id!,
    shortName: project.shortName!,
    name: project.name!,
  };
}

async function getUserAvatarUrl(userId: string, yt: Youtrack): Promise<string | undefined> {
  const { avatarUrl } = await yt.users.byId(userId);
  return avatarUrl ?? "";
}

async function customFieldToUser(user: IssueCustomFieldValue, yt: Youtrack): Promise<User> {
  return {
    id: user.id ?? "0",
    name: user.name ?? "Unknown",
    fullName: user.fullName ?? "Unknown",
    avatarUrl: user.id ? await getUserAvatarUrl(user.id, yt) : undefined,
  };
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

export async function fetchProjects(limit: number, yt: Youtrack): Promise<Project[]> {
  const projects = await yt.projects.all({ $top: limit });
  return projects.map(prepareProject);
}

export async function fetchTags(limit: number, yt: Youtrack): Promise<IssueTag[]> {
  const tags = await yt.tags.all({ $top: limit });
  return tags.filter((tag) => tag.name !== "Star");
}

export async function fetchProjectById(id: string, yt: Youtrack): Promise<Project> {
  const project = await yt.projects.byId(id);
  return prepareProject(project);
}

export async function createIssue(issue: NewIssue, yt: Youtrack): Promise<IssueImpl> {
  const newIssue = await yt.issues.create(issue);
  return newIssue;
}

function formatDate(dateString: number): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "medium" }).format(date);
}

export async function fetchIssueDetails(issue: Issue, yt: Youtrack): Promise<IssueExtended> {
  const issueDetails = await yt.issues.byId(issue.id);
  let assignee = undefined;
  if (issueDetails.fields) {
    const assigneeField = issueDetails.fields.find((field) => field.name === "Assignee");
    assignee = assigneeField?.value ?? undefined;
  }
  const { reporter, updater, tags, created, updated, project } = issueDetails;
  return {
    ...issue,
    date: formatDate(updated ?? 0),
    created: formatDate(created ?? 0),
    assignee: assignee && (await customFieldToUser(assignee, yt)),
    reporter: reporter && (await reducedUserToUser(reporter, yt)),
    updater: updater && (await reducedUserToUser(updater, yt)),
    tags,
    workItemTypes: await yt.projects.getWorkItemTypes(project?.id || ""),
  };
}

export async function createWorkItem(issue: Issue, workItem: WorkItem, yt: Youtrack) {
  return yt.workItems.create(issue.id, workItem);
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

export function prepareFavorites(cachedProjects: Project[], favorites: string[]): PreparedFavorites {
  return favorites.reduce<PreparedFavorites>(
    (acc, projectId) => {
      const cached = cachedProjects.find(({ shortName }) => shortName === projectId);
      if (cached) {
        acc.cached.push(cached);
      } else {
        acc.toFetch.push(projectId);
      }
      return acc;
    },
    { cached: [], toFetch: [] },
  );
}

export async function fetchFavorites(favorites: string[], yt: Youtrack): Promise<FetchedFavorites> {
  const favoriteProjects: FetchedFavorites = { fetched: [], errored: [] };

  for (const projectId of favorites) {
    try {
      const fetchedProject = await fetchProjectById(projectId, yt);
      favoriteProjects.fetched.push(fetchedProject);
    } catch {
      favoriteProjects.errored.push(projectId);
    }
  }

  return favoriteProjects;
}

function isTag(tag: IssueTag | undefined): tag is IssueTag {
  return Boolean(tag);
}

export function getTagsToAdd(tagsToAdd: string[], stateTags: IssueTag[]): IssueTag[] {
  return tagsToAdd.map((tag) => stateTags.find((t) => t.name === tag)).filter(isTag);
}
