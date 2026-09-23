import { Color, getPreferenceValues } from "@raycast/api";
import { ErrorText, PresentableError } from "./exception";

const prefs = getPreferenceValues<Preferences>();

function getRedmineUrl(domain: string) {
  if (domain.startsWith("https://")) return domain;
  if (domain.startsWith("http://")) return domain;
  return `https://${domain}`;
}
export const redmineUrl = getRedmineUrl(prefs.domain);

const headers = {
  Accept: "application/json",
  "X-Redmine-API-Key": prefs.token,
};
const init = {
  headers,
};

const priorityColors: Record<string, Color> = {};
(prefs.redIssues ?? "")
  .toLowerCase()
  .split(",")
  .forEach((priority) => {
    if (priority.trim()) priorityColors[priority.trim()] = Color.Red;
  });
(prefs.orangeIssues ?? "")
  .toLowerCase()
  .split(",")
  .forEach((priority) => {
    if (priority.trim()) priorityColors[priority.trim()] = Color.Orange;
  });
(prefs.blueIssues ?? "")
  .toLowerCase()
  .split(",")
  .forEach((priority) => {
    if (priority.trim()) priorityColors[priority.trim()] = Color.Blue;
  });

export function priorityColor(priority: string): Color {
  const priorityLower = priority.toLowerCase();
  if (priorityColors[priorityLower]) return priorityColors[priorityLower];
  return Color.PrimaryText;
}

type QueryParams = { [key: string]: string };
type StatusErrors = { [key: number]: ErrorText };

/**
 * Fetches a JSON object of type `Result` or throws an exception if the request fails or returns a non-okay status code.
 * @param path the Redmine path (without domain) to fetch
 * @param params an object defining the query params to request
 * @param statusErrors define custom error texts for response status codes to be thrown
 * @throws if the response's status code is not okay
 * @return the redmine response
 */
export async function redmineFetchObject<Result>(
  path: string,
  params: QueryParams = {},
  statusErrors?: StatusErrors,
): Promise<Result> {
  const response = await redmineFetch(path, params, statusErrors);
  return (await response.json()) as Result;
}

/**
 * Fetches a response from Redmine or throws an exception if the request fails or returns a non-okay status code.
 * @param path the Redmine path (without domain) to fetch
 * @param params an object defining the query params to request
 * @param statusErrors define custom error texts for response status codes to be thrown
 * @throws if the response's status code is not okay
 * @return the Redmine response
 */
export async function redmineFetch(
  path: string,
  params: QueryParams = {},
  statusErrors?: StatusErrors,
): Promise<Response> {
  const paramKeys = Object.keys(params);
  const query = paramKeys.map((key) => `${key}=${encodeURIComponent(params[key])}`).join("&");
  try {
    const sanitizedPath = path.startsWith("/") ? path.substring(1) : path;
    const url = `${redmineUrl}/${sanitizedPath}` + (query.length > 0 ? `?${query}` : "");
    const response = await fetch(url, init);
    throwIfResponseNotOkay(response, statusErrors);
    return response;
  } catch (error) {
    console.error(error);
    if (error instanceof TypeError) throw Error("Check your network connection");
    else throw error;
  }
}

const defaultStatusErrors: StatusErrors = {
  401: ErrorText("Redmine Authentication failed", "Check your Redmine credentials in the preferences."),
};

function throwIfResponseNotOkay(response: Response, statusErrors?: StatusErrors) {
  if (!response.ok) {
    const status = response.status;
    const definedStatus = statusErrors ? { ...defaultStatusErrors, ...statusErrors } : defaultStatusErrors;
    const exactStatusError = definedStatus[status];
    if (exactStatusError) throw new PresentableError(exactStatusError.name, exactStatusError.message);
    else if (status >= 500) throw new PresentableError("Redmine Error", `Server error ${status}`);
    else throw new PresentableError("Redmine Error", `Request error ${status}`);
  }
}

/* -------------------------------------------------------------------------- */
/*                              Issues data layer                             */
/* -------------------------------------------------------------------------- */

interface IssueRef {
  id: number;
  name: string;
}

export interface Issue {
  id: number;
  project: IssueRef;
  priority: IssueRef;
  tracker: IssueRef;
  status: IssueRef;
  assigned_to?: IssueRef;
  author: IssueRef;
  subject: string;
  description: string;
  start_date: string;
  due_date: string;
  updated_on?: string;
}

interface IssuesResponse {
  issues?: Issue[];
  total_count?: number;
}

/** Status filter accepted by the Redmine issues API. */
export type StatusFilter = "open" | "closed" | "all";

function statusIdParam(status: StatusFilter): string {
  if (status === "open") return "open";
  if (status === "closed") return "closed";
  return "*";
}

/**
 * Fetches issues from `/issues.json` with the given raw query params.
 * @param params raw Redmine issue filter params (e.g. `{ status_id: "open", assigned_to_id: "me" }`)
 */
export async function getIssues(params: QueryParams = {}): Promise<Issue[]> {
  const result = await redmineFetchObject<IssuesResponse>("/issues.json", params, {
    400: ErrorText("Invalid Query", "Unknown project or issue type"),
  });
  return result.issues ?? [];
}

interface SearchResult {
  id: number;
  title: string;
  type: string;
  url: string;
  description: string;
  datetime: string;
}
interface SearchResponse {
  results?: SearchResult[];
  total_count?: number;
}

let currentUserIdPromise: Promise<number> | undefined;

/** Resolves and caches the current user's numeric id (Redmine's `author_id` filter has no documented "me" shortcut). */
function getCurrentUserId(): Promise<number> {
  if (!currentUserIdPromise) {
    currentUserIdPromise = redmineFetchObject<{ user: { id: number } }>("/users/current.json").then((r) => r.user.id);
  }
  return currentUserIdPromise;
}

export interface IssueFilterOptions {
  /** Limit to open, closed, or all issues. */
  status?: StatusFilter;
  /** Only issues assigned to the current user. */
  assignedToMe?: boolean;
  /** Only issues created by the current user. */
  createdByMe?: boolean;
  /** Maximum number of issues to return (capped at 100). */
  limit?: number;
  /** Restrict to a single project id. */
  projectId?: string;
}

async function buildUserScopedParams(options: IssueFilterOptions): Promise<QueryParams> {
  const params: QueryParams = {
    status_id: statusIdParam(options.status ?? "open"),
    limit: String(Math.min(Math.max(options.limit ?? 100, 1), 100)),
  };
  if (options.assignedToMe) params.assigned_to_id = "me";
  if (options.createdByMe) params.author_id = String(await getCurrentUserId());
  if (options.projectId) params.project_id = options.projectId;
  return params;
}

/**
 * Full-text searches issues (subject + description) via `/search.json`, then loads the
 * matching issues with their structured fields via `/issues.json`.
 * @param query the free text to search for
 */
export async function searchIssues(query: string, options: IssueFilterOptions = {}): Promise<Issue[]> {
  const limit = options.limit ?? 25;
  const searchParams: QueryParams = {
    q: query,
    issues: "1",
    limit: String(Math.min(Math.max(limit, 1), 100)),
  };
  if ((options.status ?? "all") === "open") searchParams.open_issues = "1";

  const search = await redmineFetchObject<SearchResponse>("/search.json", searchParams);
  const ids = (search.results ?? []).filter((r) => r.type === "issue").map((r) => r.id);
  if (ids.length === 0) return [];

  // Re-fetch as structured issues so the caller/AI gets full fields, and let Redmine
  // apply the exact status/assignee/author/project filter (search.json can't express these).
  const issueParams = await buildUserScopedParams({ ...options, limit: ids.length });
  issueParams.issue_id = ids.join(",");
  issueParams.sort = "updated_on:desc";
  return getIssues(issueParams);
}

/** Lists issues by status/assignee/author filter (no text query), most recently updated first. */
export async function listIssues(options: IssueFilterOptions = {}): Promise<Issue[]> {
  const params = await buildUserScopedParams(options);
  params.sort = "updated_on:desc";
  return getIssues(params);
}

/** Returns the projects visible to the current user. */
export async function getProjects(): Promise<IssueRef[]> {
  const r = await redmineFetchObject<{ projects?: IssueRef[] }>("/projects.json", { limit: "100" });
  return (r.projects ?? []).map((p) => ({ id: p.id, name: p.name }));
}

/* -------------------------------------------------------------------------- */
/*                        Single issue: detail & writes                       */
/* -------------------------------------------------------------------------- */

export interface Journal {
  id: number;
  user?: IssueRef;
  notes: string;
  created_on: string;
}

export interface IssueDetail extends Issue {
  done_ratio?: number;
  journals?: Journal[];
  allowed_statuses?: IssueRef[];
}

/** Fetches a single issue including its journals (comments) and allowed status transitions. */
export async function getIssue(id: number): Promise<IssueDetail> {
  const result = await redmineFetchObject<{ issue: IssueDetail }>(`/issues/${id}.json`, {
    include: "journals,allowed_statuses",
  });
  return result.issue;
}

/** Fields that can be written to an issue via the REST API. */
export interface IssueUpdate {
  status_id?: number;
  /** A user or group id, or an empty string to clear the assignee. */
  assigned_to_id?: number | "";
  priority_id?: number;
  notes?: string;
}

/**
 * Updates an issue (assignee, status, priority) and/or adds a note (comment).
 * @throws a `PresentableError` if Redmine rejects the request
 */
export async function updateIssue(id: number, update: IssueUpdate): Promise<void> {
  await redmineWrite(`/issues/${id}.json`, "PUT", { issue: update });
}

/** Adds a comment (note) to an issue. */
export async function addComment(id: number, notes: string): Promise<void> {
  await updateIssue(id, { notes });
}

/**
 * Performs a writing request (PUT/POST) against Redmine.
 * Success responses (including 204 No Content) return nothing.
 * @throws if the response's status code is not okay
 */
async function redmineWrite(path: string, method: "PUT" | "POST", body: unknown): Promise<void> {
  try {
    const sanitizedPath = path.startsWith("/") ? path.substring(1) : path;
    const url = `${redmineUrl}/${sanitizedPath}`;
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Redmine-API-Key": prefs.token,
      },
      body: JSON.stringify(body),
    });
    throwIfResponseNotOkay(response, {
      403: ErrorText("Not allowed", "You don't have permission to modify this issue."),
      422: ErrorText("Invalid update", "Redmine rejected the change (check required fields / workflow)."),
    });
  } catch (error) {
    console.error(error);
    if (error instanceof TypeError) throw Error("Check your network connection");
    else throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*                          Option lists (for pickers)                        */
/* -------------------------------------------------------------------------- */

/** Returns all issue statuses defined on the instance. */
export async function getIssueStatuses(): Promise<IssueRef[]> {
  const r = await redmineFetchObject<{ issue_statuses?: IssueRef[] }>("/issue_statuses.json");
  return r.issue_statuses ?? [];
}

/** Returns the issue priorities defined on the instance. */
export async function getPriorities(): Promise<IssueRef[]> {
  const r = await redmineFetchObject<{ issue_priorities?: IssueRef[] }>("/enumerations/issue_priorities.json");
  return r.issue_priorities ?? [];
}

interface Membership {
  user?: IssueRef;
  group?: IssueRef;
}

/**
 * Returns the assignable candidates of the given project: its member users, plus its
 * member groups when the instance has group assignment enabled. Paginates through
 * every membership page so projects with over 100 members aren't truncated.
 */
export async function getProjectMembers(projectId: number): Promise<IssueRef[]> {
  const limit = 100;
  const memberships: Membership[] = [];
  for (let offset = 0; ; offset += limit) {
    const r = await redmineFetchObject<{ memberships?: Membership[]; total_count?: number }>(
      `/projects/${projectId}/memberships.json`,
      { limit: String(limit), offset: String(offset) },
    );
    const page = r.memberships ?? [];
    memberships.push(...page);
    if (page.length < limit || (r.total_count !== undefined && memberships.length >= r.total_count)) break;
  }
  return memberships.map((m) => m.user ?? m.group).filter((m): m is IssueRef => Boolean(m));
}
