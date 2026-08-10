import Fuse from "fuse.js";
import fetch, { Response } from "node-fetch";
import { withCache } from "@raycast/utils";
import { projectFullPathFromWebUrl } from "./utils";
import util from "util";
import fs from "fs";
import { pipeline } from "stream";
const streamPipeline = util.promisify(pipeline);
import https from "https";
import { getPreferences } from "./utils";

function readCACertFileSync(filename: string): Buffer | undefined {
  try {
    const data = fs.readFileSync(filename);
    return data;
  } catch (error) {
    throw Error(`Could not read CA cert file ${filename} ${error}`);
  }
}

function readCertFileSync(filename: string): Buffer | undefined {
  try {
    const data = fs.readFileSync(filename);
    return data;
  } catch (error) {
    throw Error(`Could not read cert file ${filename} ${error}`);
  }
}

export function getHttpAgent(): https.Agent | undefined {
  let agent: https.Agent | undefined;
  const preferences = getPreferences();
  const ignoreCertificates = preferences.ignorecerts;
  const customcacert = preferences.customcacert ?? "";
  const customcert = preferences.customcert ?? "";
  if (ignoreCertificates || customcacert.length > 0 || customcert.length > 0) {
    const caCertificate = customcacert.length > 0 ? readCACertFileSync(customcacert) : undefined;
    const clientCertificate = customcert.length > 0 ? readCertFileSync(customcert) : undefined;
    const agentOptions: https.AgentOptions = {
      rejectUnauthorized: !ignoreCertificates,
      ca: caCertificate,
      cert: clientCertificate,
    };
    agent = new https.Agent(agentOptions);
  }
  return agent;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- REST fetch boundary; parsers use GitLab*Json types below */

const activateAPILogging = false;

interface GitLabApiErrorBody {
  error?: string;
  message?: string | Record<string, string[]>;
  base?: string[];
}

interface GitLabUserJson {
  id: number;
  name: string;
  username: string;
  web_url: string;
  avatar_url: string;
  state?: string;
  public_email?: string;
  can_merge?: boolean;
}

interface GitLabProjectJson {
  id: number;
  name: string;
  name_with_namespace: string;
  path_with_namespace: string;
  web_url: string;
  star_count?: number;
  forks_count?: number;
  last_activity_at?: string;
  readme_url?: string;
  avatar_url?: string;
  owner?: GitLabUserJson;
  ssh_url_to_repo?: string;
  http_url_to_repo?: string;
  default_branch?: string;
  archived?: boolean;
  remove_source_branch_after_merge?: boolean;
  namespace: { kind: string; id: number };
}

interface GitLabPipelineJson {
  id?: number;
  status?: string;
  detailed_status?: { group?: string; label?: string };
}

interface GitLabMergeRequestJson {
  title: string;
  web_url: string;
  id: number;
  iid: number;
  state: string;
  updated_at: string;
  created_at: string;
  merged_at?: string;
  closed_at?: string;
  author?: GitLabUserJson;
  assignees: GitLabUserJson[];
  reviewers?: GitLabUserJson[];
  project_id: number;
  description?: string;
  references?: { full?: string };
  labels: Label[];
  source_branch: string;
  target_branch: string;
  merge_commit_sha?: string;
  sha?: string;
  milestone?: Milestone;
  draft?: boolean;
  has_conflicts?: boolean;
  force_remove_source_branch?: boolean;
  squash_on_merge?: boolean;
  merge_when_pipeline_succeeds?: boolean;
  user_notes_count?: number;
  user?: { can_merge?: boolean };
  head_pipeline?: GitLabPipelineJson;
  pipeline?: GitLabPipelineJson;
}

interface GitLabIssueJson {
  title: string;
  description?: string;
  web_url: string;
  id: number;
  iid: number;
  references?: { full?: string };
  state: string;
  updated_at: string;
  created_at: string;
  author?: GitLabUserJson;
  assignees: GitLabUserJson[];
  project_id: number;
  milestone?: GitLabMilestoneJson;
  labels: Label[];
  user_notes_count?: number;
  merge_requests_count?: number;
}

interface GitLabMilestoneJson {
  id: number;
  title: string;
}

interface GitLabLabelJson {
  id: number;
  name: string;
  color: string;
  text_color?: string;
  description?: string;
  subscribed?: boolean;
}

interface GitLabTemplateJson {
  key: string;
  name: string;
  content?: string;
}

interface GitLabTodoTargetJson {
  title: string;
  state?: string;
}

interface GitLabTodoJson {
  id: number;
  action_name: string;
  target_url: string;
  target_type: string;
  target: GitLabTodoTargetJson;
  created_at: string;
  updated_at: string;
  project?: { name_with_namespace: string };
  group?: TodoGroup;
  author?: GitLabUserJson;
}

export function logAPI(message?: any, ...optionalParams: any[]) {
  if (activateAPILogging) {
    console.log(message, ...optionalParams);
  }
}

function maybeUserFromJson(data: GitLabUserJson | undefined | null): User | undefined {
  return data ? userFromJson(data) : undefined;
}

function userFromJson(data: GitLabUserJson): User {
  return {
    id: data.id,
    name: data.name,
    username: data.username,
    web_url: data.web_url,
    avatar_url: data.avatar_url,
    state: data.state ?? "",
    public_email: data.public_email ?? "",
  };
}

export function dataToProject(project: GitLabProjectJson): Project {
  return {
    id: project.id,
    group_id: project.namespace.kind == "group" ? project.namespace.id : 0,
    name: project.name,
    name_with_namespace: project.name_with_namespace,
    fullPath: project.path_with_namespace,
    web_url: project.web_url,
    star_count: project.star_count ?? 0,
    fork_count: project.forks_count ?? 0,
    last_activity_at: project.last_activity_at ?? "",
    readme_url: project.readme_url ?? "",
    avatar_url: project.avatar_url ?? "",
    owner: maybeUserFromJson(project.owner),
    ssh_url_to_repo: project.ssh_url_to_repo,
    http_url_to_repo: project.http_url_to_repo,
    default_branch: project.default_branch ?? "",
    archived: project.archived ?? false,
    remove_source_branch_after_merge: project.remove_source_branch_after_merge ?? false,
  };
}

function pipelineStatusFromJson(pipeline: GitLabPipelineJson | undefined | null): string | undefined {
  if (!pipeline || typeof pipeline !== "object") {
    return undefined;
  }
  if (typeof pipeline.status === "string" && pipeline.status.length > 0) {
    return pipeline.status;
  }
  if (pipeline.detailed_status && typeof pipeline.detailed_status === "object") {
    if (typeof pipeline.detailed_status.group === "string" && pipeline.detailed_status.group.length > 0) {
      return pipeline.detailed_status.group;
    }
    if (typeof pipeline.detailed_status.label === "string" && pipeline.detailed_status.label.length > 0) {
      return pipeline.detailed_status.label;
    }
  }
  return undefined;
}

function headPipelineFromPipelineJson(pipeline: GitLabPipelineJson | undefined | null): MRHeadPipeline | undefined {
  const status = pipelineStatusFromJson(pipeline);
  if (!status || pipeline?.id == null) {
    return undefined;
  }
  return {
    id: pipeline.id,
    status,
  };
}

function parseHeadPipelineFromJson(
  mr: Pick<GitLabMergeRequestJson, "head_pipeline" | "pipeline">,
): MRHeadPipeline | undefined {
  return headPipelineFromPipelineJson(mr.head_pipeline ?? mr.pipeline);
}

function projectWebUrlFromMrWebUrl(webUrl: string): string {
  const index = webUrl.indexOf("/-/");
  return index > 1 ? webUrl.substring(0, index) : "";
}

export function jsonDataToMergeRequest(mr: GitLabMergeRequestJson): MergeRequest {
  return {
    title: mr.title,
    web_url: mr.web_url,
    gql_id: "",
    project_web_url: projectWebUrlFromMrWebUrl(mr.web_url),
    project_full_path: projectFullPathFromWebUrl(projectWebUrlFromMrWebUrl(mr.web_url)),
    id: mr.id,
    iid: mr.iid,
    state: mr.state,
    updated_at: mr.updated_at,
    created_at: mr.created_at,
    merged_at: mr.merged_at ?? "",
    closed_at: mr.closed_at ?? "",
    author: maybeUserFromJson(mr.author),
    assignees: mr.assignees.map(userFromJson),
    reviewers: mr.reviewers?.map(userFromJson) || [],
    project_id: mr.project_id,
    description: mr.description ?? "",
    reference_full: mr.references?.full ?? "",
    labels: mr.labels as Label[],
    source_branch: mr.source_branch,
    target_branch: mr.target_branch,
    merge_commit_sha: mr.merge_commit_sha ?? "",
    sha: mr.sha ?? "",
    milestone: mr.milestone ? (mr.milestone as Milestone) : undefined,
    draft: mr.draft ?? false,
    has_conflicts: mr.has_conflicts === true || false,
    force_remove_source_branch: mr.force_remove_source_branch ?? false,
    squash_on_merge: mr.squash_on_merge ?? false,
    merge_when_pipeline_succeeds: mr.merge_when_pipeline_succeeds ?? false,
    user_notes_count: mr.user_notes_count ?? 0,
    user: mr.user ? { can_merge: mr.user.can_merge === true } : undefined,
    head_pipeline: parseHeadPipelineFromJson(mr),
  };
}

export function jsonDataToIssue(issue: GitLabIssueJson): Issue {
  const dataToMilestone = (data: GitLabMilestoneJson | undefined | null): Milestone | undefined => {
    if (data) {
      return {
        id: data.id,
        title: data.title,
      };
    }
    return undefined;
  };
  return {
    title: issue.title,
    description: issue.description ?? "",
    web_url: issue.web_url,
    id: issue.id,
    iid: issue.iid,
    reference_full: issue.references?.full ?? "",
    state: issue.state,
    updated_at: issue.updated_at,
    created_at: issue.created_at,
    author: maybeUserFromJson(issue.author),
    assignees: issue.assignees.map(userFromJson),
    project_id: issue.project_id,
    milestone: dataToMilestone(issue.milestone),
    labels: issue.labels as Label[],
    user_notes_count: issue.user_notes_count ?? 0,
    merge_requests_count: issue.merge_requests_count ?? 0,
  };
}

/**
 * Converts a params object to a query string, supporting arrays and nested keys (e.g., labels[], not[labels][]).
 * - Arrays are output as multiple key[]=value pairs.
 * - Nested keys (e.g., not[labels][]) are supported if the key is in the form 'not[labels][]'.
 */
function paramString(params: { [key: string]: any }): string {
  const queryParts: string[] = [];
  for (const key in params) {
    const value = params[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
      }
    } else {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  let prefix = "";
  if (queryParts.length > 0) {
    prefix = "?";
  }
  return prefix + queryParts.join("&");
}

function getNextPageNumber(page_response: Response): number | undefined {
  const header = page_response.headers.get("x-next-page");
  return header ? parseInt(header) : undefined;
}

export enum EpicState {
  opened = "opened",
  closed = "closed",
  all = "all",
}

export enum EpicScope {
  created_by_me = "created_by_me",
  all = "all",
}

export interface Branch {
  name: string;
  default: boolean;
  web_url: string;
  merged?: boolean;
  protected?: boolean;
  id?: string;
  commit?: { id?: string; committed_date?: string; title?: string };
}

export interface Epic {
  id: number;
  iid: number;
  group_id: number;
  title: string;
  state: string;
  web_url: string;
  updated_at?: string;
  upvotes?: number;
  downvotes?: number;
  references?: { full?: string };
  author?: User;
}

export interface Group {
  id: number;
  web_url: string;
  name: string;
  path: string;
  description: string;
  full_name: string;
  full_path: string;
  projects: Project[];
  avatar_url?: string;
  owner?: { avatar_url?: string };
}

export class Label {
  public id = 0;
  public name = "";
  public color = "";
  public textColor = "";
  public description = "";
  public subscribed?: boolean | undefined;
}

export class Milestone {
  public id = 0;
  public title = "";
}

export class Issue {
  public title = "";
  public description = "";
  public web_url = "";
  public id = 0;
  public iid = 0;
  public reference_full = "";
  public state = "";
  public author: User | undefined;
  public assignees: User[] = [];
  public updated_at = "";
  public created_at = "";
  public project_id = 0;
  public milestone?: Milestone = undefined;
  public labels: Label[] = [];
  public user_notes_count: number | undefined = undefined;
  public merge_requests_count: number = 0;
}

export interface MRDiscussionNotePosition {
  file_path: string;
  line?: number;
  line_type?: "new" | "old";
  head_sha?: string;
  start_sha?: string;
}

export interface MRDiscussionNote {
  body: string;
  author?: User;
  created_at: string;
  web_url: string;
  position?: MRDiscussionNotePosition;
  resolvable?: boolean;
  resolved?: boolean;
  system?: boolean;
}

export interface MRDiscussion {
  id: string;
  resolvable?: boolean;
  resolved?: boolean;
  notes?: MRDiscussionNote[];
}

export interface MergeRequestUser {
  can_merge?: boolean;
  can_update?: boolean;
  approved?: boolean;
}

export interface MRHeadPipeline {
  id: number;
  status: string;
}

export class MergeRequest {
  public title = "";
  public description = "";
  public project_web_url = "";
  public project_full_path = "";
  public web_url = "";
  public gql_id = "";
  public id = 0;
  public iid = 0;
  public state = "";
  public author: User | undefined;
  public assignees: User[] = [];
  public reviewers: User[] = [];
  public updated_at = "";
  public created_at = "";
  public merged_at = "";
  public closed_at = "";
  public project_id = 0;
  public reference_full = "";
  public labels: Label[] = [];
  public source_branch = "";
  public target_branch = "";
  public merge_commit_sha = "";
  public sha = "";
  public milestone?: Milestone;
  public draft = false;
  public has_conflicts = false;
  public force_remove_source_branch: boolean | undefined = undefined;
  public squash_on_merge: boolean | undefined = undefined;
  public merge_when_pipeline_succeeds: boolean | undefined = undefined;
  public user_notes_count: number | undefined = undefined;
  public user?: MergeRequestUser;
  public head_pipeline?: MRHeadPipeline;
  public resolved_discussions_count?: number;
  public resolvable_discussions_count?: number;
  public approvals_count?: number;
  public todo_id?: number;
}

export class Pipeline {
  public id = 0;
  public iid = "";
  public projectId = "";
  public status = "";
  public ref = "";
  public sha = "";
  public before_sha = "";
  public tag = false;
  public user?: User;
  public created_at = "";
  public updated_at = "";
  public started_at = "";
  public finished_at = "";
  public committed_at = "";
  public duration = 0;
  public queued_duration = 0;
  public coverage = "";
  public webUrl = "";
  public commit_title = "";
}

export interface TodoGroup {
  id: number;
  name: string;
  path: string;
  kind: string;
  full_path: string;
  parent_id: number;
  avatar_url?: string;
  web_url: string;
}

export class Todo {
  public title = "";
  public target_url = "";
  public target_type = "";
  public target: any;
  public id = 0;
  public action_name = "";
  public project_with_namespace = "";
  public group?: TodoGroup;
  public author?: User = undefined;
  public created_at = "";
  public updated_at = "";
}

export class Project {
  public id = 0;
  public group_id = 0;
  public name_with_namespace = "";
  public name = "";
  public fullPath = "";
  public web_url = "";
  public star_count = 0;
  public fork_count = 0;
  public last_activity_at = "";
  public readme_url = "";
  public avatar_url = "";
  public owner?: User;
  public ssh_url_to_repo?: string = undefined;
  public http_url_to_repo?: string = undefined;
  public default_branch = "";
  public archived = false;
  public remove_source_branch_after_merge = false;
}

export class User {
  public id = 0;
  public name = "";
  public username = "";
  public state = "";
  public avatar_url = "";
  public web_url = "";
  public public_email = "";
}

export class TemplateSummary {
  public id = "";
  public name = "";
}

export class TemplateDetail {
  public name = "";
  public content = "";
}

export interface Status {
  emoji: string;
  message: string;
  clear_status_after?: string | undefined;
  clear_status_at?: Date | undefined;
}

export interface MergeRequestApprovals {
  approved: boolean;
  approvals_required?: number;
  approvals_left?: number;
  approved_by?: { user: User; approved_at: string }[];
}

export function isValidStatus(status: Status): boolean {
  if (status.message || status.emoji) {
    return true;
  }
  return false;
}

function gitLabApiValidationMessage(message: string | Record<string, string[]> | undefined): string | undefined {
  if (!message) {
    return undefined;
  }
  if (typeof message === "string") {
    return message;
  }
  const parts = Object.values(message).flatMap((entries) => entries);
  return parts.length > 0 ? parts.join(" ") : JSON.stringify(message);
}

function gitLabApiErrorDescription(json: GitLabApiErrorBody, statusCode: number): string {
  if (statusCode === 401) {
    return "Unauthorized";
  }
  if (statusCode === 403) {
    if (json.error === "insufficient_scope") {
      return "Insufficient API token scope";
    }
    return json.error ?? gitLabApiValidationMessage(json.message) ?? "Forbidden";
  }
  if (statusCode === 404) {
    return "Not found";
  }
  const validationMessage =
    gitLabApiValidationMessage(json.message) ?? (json.base?.length ? json.base.join(" ") : undefined);
  if (validationMessage) {
    return validationMessage;
  }
  if (json.error) {
    return json.error;
  }
  return `http status ${statusCode}`;
}

async function warnGitLabApiErrorResponse(response: Response, url: string, method?: string): Promise<void> {
  const statusCode = response.status;
  let description = response.statusText || `http status ${statusCode}`;
  let body: unknown;
  try {
    body = await response.clone().json();
    description = gitLabApiErrorDescription(body as GitLabApiErrorBody, statusCode);
  } catch {
    try {
      body = await response.clone().text();
    } catch {
      // unreadable error body
    }
  }
  const verb = method?.toUpperCase() || "GET";
  console.warn(`GitLab API ${verb} ${statusCode}: ${description} (${url})`, body ?? "");
}

/**
 * Returns true when the request body can be safely replayed after a 401.
 * Streams and FormData are consumed by the first send and cannot be reused.
 */
function isReplayableBody(body: unknown): boolean {
  if (body == null) return true;
  const requestBody = body as { pipe?: unknown; read?: unknown; getBuffer?: unknown; getBoundary?: unknown };
  if (typeof requestBody.pipe === "function" || typeof requestBody.read === "function") return false;
  if (typeof requestBody.getBuffer === "function" && typeof requestBody.getBoundary === "function") return false;
  return true;
}

function logGitLabApiRequest(url: string, method?: string, body?: unknown): void {
  const verb = method?.toUpperCase() || "GET";
  if (body != null && typeof body === "string") {
    console.log(`GitLab API → ${verb} ${url}`, body);
  } else if (body != null && isReplayableBody(body)) {
    console.log(`GitLab API → ${verb} ${url}`, body);
  } else {
    console.log(`GitLab API → ${verb} ${url}`);
  }
}

async function toJsonOrError(response: Response): Promise<any> {
  const statusCode = response.status;
  logAPI(`status code: ${statusCode}`);
  if (statusCode >= 200 && statusCode < 300) {
    const json = await response.json();
    return json;
  } else if (statusCode == 401) {
    throw Error("Unauthorized");
  } else if (statusCode == 403) {
    const json = (await response.json()) as GitLabApiErrorBody;
    const msg = gitLabApiErrorDescription(json, statusCode);
    logAPI(msg);
    throw Error(msg);
  } else if (statusCode == 404) {
    throw Error("Not found");
  } else if (statusCode >= 400 && statusCode < 500) {
    const json = (await response.json()) as GitLabApiErrorBody;
    logAPI(json);
    throw Error(gitLabApiErrorDescription(json, statusCode));
  } else {
    logAPI("unknown error");
    throw Error(`http status ${statusCode}`);
  }
}

type AuthType = "pat" | "oauth";
type TokenResolver = () => Promise<string>;
export interface AuthConfig {
  authType: AuthType;
  resolve: TokenResolver;
  /** Force-refresh the token after a 401. Only consulted when `authType === "oauth"`. */
  refresh?: () => Promise<string>;
}

export class GitLab {
  private readonly url: string;
  private readonly auth: AuthConfig;

  constructor(url: string, auth: string | AuthConfig) {
    this.url = url;
    this.auth = typeof auth === "string" ? { authType: "pat", resolve: async () => auth } : auth;
  }

  private buildAuthHeaders(token: string): Record<string, string> {
    return this.auth.authType === "oauth" ? { Authorization: `Bearer ${token}` } : { "PRIVATE-TOKEN": token };
  }

  private async resolveToken(force = false): Promise<string> {
    return force && this.auth.refresh ? this.auth.refresh() : this.auth.resolve();
  }

  private getFetcher() {
    return async (...args: Parameters<typeof fetch>) => {
      const [fullUrl, options] = args;
      const agent = getHttpAgent();
      const requestUrl = typeof fullUrl === "string" ? fullUrl : fullUrl.toString();
      const requestMethod = typeof options?.method === "string" ? options.method : "GET";
      logGitLabApiRequest(requestUrl, requestMethod, options?.body);

      const send = async (token: string) =>
        fetch(fullUrl, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
            ...this.buildAuthHeaders(token),
          },
          agent,
        });

      const response = await send(await this.resolveToken());

      // On OAuth 401, force-refresh once and retry. Skip the retry for
      // non-replayable bodies (streams, FormData) since they were consumed.
      if (
        response.status === 401 &&
        this.auth.authType === "oauth" &&
        this.auth.refresh &&
        isReplayableBody(options?.body)
      ) {
        try {
          const fresh = await this.resolveToken(true);
          logGitLabApiRequest(`${requestUrl} (oauth retry)`, requestMethod);
          const retryResponse = await send(fresh);
          if (!retryResponse.ok) {
            await warnGitLabApiErrorResponse(retryResponse, requestUrl, requestMethod);
          }
          return retryResponse;
        } catch {
          await warnGitLabApiErrorResponse(response, requestUrl, requestMethod);
          return response;
        }
      }

      if (!response.ok) {
        await warnGitLabApiErrorResponse(response, requestUrl, requestMethod);
      }
      return response;
    };
  }

  public joinUrl(relativeUrl: string): string {
    return new URL(relativeUrl, this.url).href;
  }

  public async fetch(url: string, params: { [key: string]: string } = {}, all = false): Promise<any> {
    const per_page = all ? 100 : 50;
    const fetchPage = async (page: number): Promise<Response> => {
      const pagedParams = { ...params, per_page: params.per_page ?? `${per_page}`, page: `${page}` };
      const queryString = paramString(pagedParams);
      const fullUrl = this.url + "/api/v4/" + url + queryString;
      logAPI(`send GET request: ${fullUrl}`);
      const fetcher = this.getFetcher();
      const response = await fetcher(fullUrl, {
        method: "GET",
      });
      return response;
    };
    try {
      const response = await fetchPage(1);
      let json = await toJsonOrError(response);
      if (!all) {
        return json;
      }

      let next_page = getNextPageNumber(response);
      while (next_page) {
        logAPI(next_page);
        const page_response = await fetchPage(next_page);
        const page_content = await toJsonOrError(page_response);
        json = json.concat(page_content);
        next_page = getNextPageNumber(page_response);
      }
      return json;
    } catch (error: any) {
      throw Error(error); // rethrow error, otherwise raycast could not catch the error
    }
  }

  public async fetchPaged(
    url: string,
    params: { [key: string]: string } = {},
    page = 1,
    perPage = 50,
  ): Promise<{ data: any; hasMore: boolean }> {
    const pagedParams = { ...params, per_page: params.per_page ?? `${perPage}`, page: `${page}` };
    const queryString = paramString(pagedParams);
    const fullUrl = this.url + "/api/v4/" + url + queryString;
    logAPI(`send GET request: ${fullUrl}`);
    const fetcher = this.getFetcher();
    try {
      const response = await fetcher(fullUrl, {
        method: "GET",
      });
      const data = await toJsonOrError(response);
      const hasMore = getNextPageNumber(response) !== undefined;
      return { data, hasMore };
    } catch (error: any) {
      throw Error(error); // rethrow error, otherwise raycast could not catch the error
    }
  }

  public jobTraceDownloadUrl(projectId: number | string, jobId: number | string): string {
    return `${this.url}/api/v4/projects/${projectId}/jobs/${jobId}/trace`;
  }

  public jobArtifactsArchiveDownloadUrl(projectId: number | string, jobId: number | string): string {
    return `${this.url}/api/v4/projects/${projectId}/jobs/${jobId}/artifacts`;
  }

  public jobArtifactDownloadUrl(projectId: number | string, jobId: number | string, artifactPath: string): string {
    const encodedPath = artifactPath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `${this.url}/api/v4/projects/${projectId}/jobs/${jobId}/artifacts/${encodedPath}`;
  }

  public async downloadJobArtifact(
    projectId: number | string,
    jobId: number | string,
    artifactPath: string,
    localFilepath: string,
  ): Promise<string> {
    return this.downloadFile(this.jobArtifactDownloadUrl(projectId, jobId, artifactPath), { localFilepath });
  }

  public async downloadFile(url: string, params: { localFilepath: string }): Promise<string> {
    logAPI(`download ${url}`);
    const fetcher = this.getFetcher();
    const response = await fetcher(url, {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`unexpected response ${response.statusText}`);
    }
    logAPI(`write ${url} to ${params.localFilepath}`);
    if (!response.body) {
      throw new Error(`response body is null for ${url}`);
    }
    await streamPipeline(response.body, fs.createWriteStream(params.localFilepath));
    return params.localFilepath;
  }

  public async post(url: string, params: { [key: string]: any } = {}): Promise<any> {
    const fullUrl = this.url + "/api/v4/" + url;
    logAPI(`send POST request: ${fullUrl}`);
    logAPI(params);
    try {
      const fetcher = this.getFetcher();
      const response = await fetcher(fullUrl, {
        method: "POST",
        body: JSON.stringify(params),
      });
      const statusCode = response.status;
      logAPI(`status code: ${statusCode}`);
      if (statusCode === 204 || statusCode === 304) {
        return;
      }

      if (statusCode >= 200 && statusCode < 300) {
        return await response.json();
      }

      if (statusCode === 401) {
        throw Error("Unauthorized");
      }

      if (statusCode === 403) {
        const json = (await response.json()) as GitLabApiErrorBody;
        const msg = gitLabApiErrorDescription(json, statusCode);
        logAPI(msg);
        throw Error(msg);
      }

      if (statusCode === 404) {
        throw Error("Not found");
      }

      if (statusCode >= 400 && statusCode < 500) {
        const json = (await response.json()) as GitLabApiErrorBody;
        logAPI(json);
        throw Error(gitLabApiErrorDescription(json, statusCode));
      }

      logAPI("unknown error");
      throw Error(`http status ${statusCode}`);
    } catch (error: any) {
      logAPI(`catch error: ${error}`);
      throw Error(error.message); // rethrow error, otherwise raycast could not catch the error
    }
  }

  public async put(url: string, params: { [key: string]: any } = {}): Promise<void> {
    const fullUrl = this.url + "/api/v4/" + url;
    logAPI(`send PUT request: ${fullUrl}`);
    logAPI(params);
    try {
      const fetcher = this.getFetcher();
      const response = await fetcher(fullUrl, {
        method: "PUT",
        body: JSON.stringify(params),
      });
      await toJsonOrError(response);
    } catch (error: any) {
      logAPI(`catch error: ${error}`);
      throw Error(error.message); // rethrow error, otherwise raycast could not catch the error
    }
  }

  public async delete(url: string): Promise<void> {
    const fullUrl = this.url + "/api/v4/" + url;
    logAPI(`send DELETE request: ${fullUrl}`);
    try {
      const fetcher = this.getFetcher();
      const response = await fetcher(fullUrl, {
        method: "DELETE",
      });
      await toJsonOrError(response);
    } catch (error: any) {
      logAPI(`catch error: ${error}`);
      throw Error(error.message); // rethrow error, otherwise raycast could not catch the error
    }
  }

  /**
   * Fetches issues for a project, supporting label inclusion and exclusion.
   * If params.includeLabels or params.excludeLabels are provided (comma-separated strings),
   * they are mapped to the correct GitLab API query parameters:
   *   - labels[] for inclusion
   *   - not[labels][] for exclusion
   */
  async getIssues(params: Record<string, any>, project?: Project, all?: boolean): Promise<Issue[]> {
    const projectPrefix = project ? `projects/${project.id}/` : "";

    // Build correct label filter params for GitLab API
    if (params.includeLabels) {
      const includeArr = params.includeLabels
        .split(",")
        .map((label: string) => label.trim())
        .filter((label: string) => label.length > 0);
      if (includeArr.length > 0) {
        params["labels[]"] = includeArr;
      }
      delete params.includeLabels;
    }
    if (params.excludeLabels) {
      const excludeArr = params.excludeLabels
        .split(",")
        .map((label: string) => label.trim())
        .filter((label: string) => label.length > 0);
      if (excludeArr.length > 0) {
        params["not[labels][]"] = excludeArr;
      }
      delete params.excludeLabels;
    }

    if (!params.with_labels_details) {
      params.with_labels_details = "true";
    }

    const issueItems: Issue[] = await this.fetch(`${projectPrefix}issues`, params, all).then((issues) => {
      return (issues as GitLabIssueJson[]).map((issue) => jsonDataToIssue(issue));
    });
    return issueItems;
  }

  async getIssue(projectID: number, issueID: number, params: Record<string, any>): Promise<Issue> {
    if (!params.with_labels_details) {
      params.with_labels_details = "true";
    }
    const projectPrefix = `projects/${projectID}/issues/${issueID}`;
    const result: Issue = await this.fetch(`${projectPrefix}`, params).then((issue) => {
      return jsonDataToIssue(issue as GitLabIssueJson);
    });
    return result;
  }

  async getGroupIssues(params: Record<string, any>, groupID: number): Promise<Issue[]> {
    if (!params.with_labels_details) {
      params.with_labels_details = "true";
    }
    const issueItems: Issue[] = await this.fetch(`groups/${groupID}/issues`, params).then((issues) => {
      return (issues as GitLabIssueJson[]).map((issue) => jsonDataToIssue(issue));
    });
    return issueItems;
  }

  async createIssue(projectID: number, data: { [key: string]: any }): Promise<void> {
    await this.post(`projects/${projectID}/issues`, data);
  }

  async createMR(projectID: number, data: { [key: string]: any }): Promise<void> {
    await this.post(`projects/${projectID}/merge_requests`, data);
  }

  async updateMR(projectID: number, mrIID: number, data: { [key: string]: any }): Promise<void> {
    await this.put(`projects/${projectID}/merge_requests/${mrIID}`, data);
  }

  async getProjectMember(projectId: number): Promise<User[]> {
    const userItems: User[] = await this.fetch(`projects/${projectId}/users`, {}, true).then((users) => {
      return (users as GitLabUserJson[]).map((userdata) => userFromJson(userdata));
    });
    return userItems;
  }

  async getProjectLabels(projectId: number): Promise<Label[]> {
    const items: Label[] = await this.fetch(`projects/${projectId}/labels`, {}, true).then((labels) => {
      return (labels as GitLabLabelJson[]).map((data) => ({
        id: data.id,
        name: data.name,
        color: data.color,
        textColor: data.text_color ?? "",
        description: data.description ?? "",
        subscribed: data.subscribed || undefined,
      }));
    });
    return items;
  }

  async getProjectMilestones(projectId: number): Promise<Milestone[]> {
    const items: Milestone[] = await this.fetch(`projects/${projectId}/milestones`).then((labels) => {
      return (labels as GitLabMilestoneJson[]).map((data) => ({
        id: data.id,
        title: data.title,
      }));
    });
    return items;
  }

  async getProjectMergeRequestTemplates(projectId: number): Promise<TemplateSummary[]> {
    const items: TemplateSummary[] = await this.fetch(`projects/${projectId}/templates/merge_requests`).then(
      (templates) => {
        return (templates as GitLabTemplateJson[]).map((template) => ({
          id: template.key,
          name: template.name,
        }));
      },
    );
    return items;
  }

  async getProjectMergeRequestTemplate(projectId: number, templateName: string): Promise<TemplateDetail> {
    const item: TemplateDetail = await this.fetch(
      `projects/${projectId}/templates/merge_requests/${templateName}`,
    ).then((template) => {
      const data = template as GitLabTemplateJson;
      return {
        name: data.name,
        content: data.content ?? "",
      };
    });
    return item;
  }

  async getGroupMilestones(group: Group): Promise<Milestone[]> {
    const items: Milestone[] = await this.fetch(`groups/${group.id}/milestones`).then((labels) => {
      return (labels as GitLabMilestoneJson[]).map((data) => ({
        id: data.id,
        title: data.title,
      }));
    });
    return items;
  }

  async getUserProjects(params: Record<string, any> = {}, all: boolean): Promise<Project[]> {
    if (!params.min_access_level) {
      params.min_access_level = "30";
    }
    return await this.fetch("projects", params, all).then((projects) => {
      return (projects as GitLabProjectJson[]).map((project) => dataToProject(project));
    });
  }

  async getProjects(args = { searchText: "", searchIn: "", membership: "true", active: false }): Promise<Project[]> {
    const params: { [key: string]: string } = {};
    if (args.searchText) {
      params.search = args.searchText;
      params.in = args.searchIn || "title";
    }
    params.membership = args.membership;
    if (args.active) {
      params.active = "true";
    }
    const issueItems: Project[] = await this.fetch("projects", params).then((projects) => {
      return (projects as GitLabProjectJson[]).map((project) => dataToProject(project));
    });
    return issueItems;
  }

  async getProject(projectID: number): Promise<Project> {
    return this.fetch(`projects/${projectID}`).then((project) => dataToProject(project as GitLabProjectJson));
  }

  async getStarredProjects(args = { searchText: "", searchIn: "" }, all: boolean): Promise<Project[]> {
    const params: { [key: string]: string } = {};
    if (args.searchText && args.searchText.length > 0) {
      params.searchText = args.searchText;
    }
    if (args.searchIn && args.searchIn.length > 0) {
      params.searchIn = args.searchIn;
    }
    const user = await this.getMyself();
    const projects: Project[] = await this.fetch(`users/${user.id}/starred_projects`, params, all).then((projects) => {
      return (projects as GitLabProjectJson[]).map((project) => dataToProject(project));
    });
    return projects;
  }

  async getUsers(args = { searchText: "", searchIn: "" }): Promise<User[]> {
    const params: { [key: string]: string } = {};
    if (args.searchText) {
      params.search = args.searchText;
      params.in = args.searchIn || "title";
    }
    const userItems: User[] = await this.fetch("users", params).then((users) => {
      return (users as GitLabUserJson[]).map((userdata) => userFromJson(userdata));
    });
    return userItems;
  }

  async getMergeRequestsApprovalsFromProjectMR({
    params,
    projectID,
    mrIID,
  }: {
    projectID: number;
    mrIID: number;
    params?: Record<string, any>;
  }): Promise<MergeRequestApprovals> {
    if (!params) {
      params = {};
    }
    if (!params?.with_labels_details) {
      params.with_labels_details = "true";
    }
    const projectPrefix = `projects/${projectID}/merge_requests/${mrIID}/approvals`;
    const result: MergeRequestApprovals = (await this.fetch(`${projectPrefix}/`, params)) as MergeRequestApprovals;
    return result;
  }

  async getTodos(params: Record<string, any>, all?: boolean): Promise<Todo[]> {
    const issueItems: Todo[] = await this.fetch("todos", params, all).then((issues) => {
      return (issues as GitLabTodoJson[]).map((issue) => ({
        title: issue.target.title,
        action_name: issue.action_name,
        target_url: issue.target_url,
        target_type: issue.target_type,
        target: issue.target,
        id: issue.id,
        project_with_namespace: issue.project?.name_with_namespace ?? "",
        group: issue.group,
        author: maybeUserFromJson(issue.author),
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      }));
    });

    if (params.search) {
      const lowerSearch = params.search.toLowerCase();
      const filtered = issueItems.filter((todo: Todo) => {
        return todo.title.toLowerCase().includes(lowerSearch);
      });
      return filtered;
    }
    return issueItems;
  }

  async getMyself(): Promise<User> {
    return getMyselfCached(this);
  }

  async getGroups(args = { searchText: "", searchIn: "" }): Promise<Group[]> {
    const params: { [key: string]: string } = {};
    if (args.searchText) {
      params.search = args.searchText;
      params.in = args.searchIn || "title";
    }
    const groupItems: Group[] = ((await this.fetch("groups", params)) as Group[]) || [];
    return groupItems;
  }

  async getUserGroups(
    params: { min_access_level?: string; search?: string; top_level_only?: boolean } = {},
  ): Promise<any> {
    const search = params.search;
    const fetchParams: Record<string, string> = {
      min_access_level: params.min_access_level ?? "30",
    };
    if (params.top_level_only !== undefined) {
      fetchParams.top_level_only = `${params.top_level_only}`;
    }
    const dataAll: Group[] = await fetchUserGroupsCached(this, fetchParams);
    return searchData<Group>(dataAll, { search: search || "", keys: ["title"], limit: 50 });
  }

  async getUserEpics(
    params: {
      min_access_level?: string;
      scope?: EpicScope;
      state?: EpicState;
      author_id?: number;
      groupid?: string;
      include_ancestor_groups?: boolean;
      include_descendant_groups?: boolean;
    } = {},
  ): Promise<Epic[]> {
    if (!params.min_access_level) {
      params.min_access_level = "30";
    }

    if (params.scope) {
      if (params.scope == EpicScope.created_by_me) {
        const user = await this.getMyself();
        params.author_id = user.id;
      }
      delete params.scope;
    }

    const groupid = params.groupid;

    if (params.include_ancestor_groups === undefined) {
      params.include_ancestor_groups = false;
    }
    if (params.include_descendant_groups === undefined) {
      params.include_descendant_groups = false;
    }
    if (groupid && params.include_ancestor_groups) {
      delete params.include_ancestor_groups;
    }

    if (groupid) {
      try {
        const data = (await this.fetch(`groups/${groupid}/epics`, params as Record<string, any>, true)) || [];
        return data;
      } catch (error: any) {
        logAPI(`skip during error ${error}`);
        return [];
      }
    }

    const groups = await this.getUserGroups({ top_level_only: true });
    const epics: Epic[] = [];
    for (const group of groups) {
      try {
        const data = (await this.fetch(`groups/${group.id}/epics`, params as Record<string, any>, true)) || [];
        for (const epic of data) {
          epics.push(epic);
        }
      } catch (error: any) {
        logAPI(`skip during error ${error}`);
      }
    }
    if (params.include_ancestor_groups === true && !groupid) {
      return (
        epics.filter(
          (epic, index, allEpics) => allEpics.findIndex((candidate) => candidate.id === epic.id) === index,
        ) || []
      );
    }
    return epics;
  }

  async getUserStatus(): Promise<Status> {
    const status: Status = await this.fetch("user/status").then((data) => {
      return {
        message: data.message,
        emoji: data.emoji,
        clear_status_at: data.clear_status_at ? new Date(data.clear_status_at as string) : undefined,
      };
    });
    return status;
  }

  async setUserStatus(status: Status): Promise<void> {
    const params: Record<string, string> = {
      emoji: status.emoji,
      message: status.message,
    };
    if (status.clear_status_after && status.clear_status_after.length > 0) {
      params.clear_status_after = status.clear_status_after;
    }
    await this.put("user/status", params);
  }

  async clearUserStatus(): Promise<void> {
    const status: Status = {
      emoji: "",
      message: "",
      clear_status_after: "",
    };
    await this.put("user/status", {
      emoji: status.emoji,
      message: status.message,
    });
  }

  async getProjectReadme(project: Project): Promise<string> {
    const filePath = project.readme_url?.split("/-/blob/")[1]?.split("/").slice(1).join("/") || "README.md";
    const fullUrl = `${this.url}/api/v4/projects/${project.id}/repository/files/${encodeURIComponent(filePath)}/raw`;

    logAPI(`send GET request: ${fullUrl}`);
    const fetcher = this.getFetcher();
    const response = await fetcher(fullUrl, { method: "GET" });
    if (!response.ok) {
      throw new Error(`unexpected response ${response.statusText}`);
    }
    return await response.text();
  }

  async triggerPipeline(
    projectID: number,
    ref: string,
    variables: { key: string; value: string }[] = [],
  ): Promise<{ id: number; web_url: string }> {
    const body: Record<string, any> = { ref };
    if (variables.length > 0) {
      body.variables = variables.map((variable) => ({
        key: variable.key,
        value: variable.value,
        variable_type: "env_var",
      }));
    }
    return await this.post(`projects/${projectID}/pipeline`, body);
  }

  async getProjectBranches(projectID: number, search?: string): Promise<Branch[]> {
    const params: Record<string, string> = {};
    if (search && search.length > 0) {
      params.search = search;
    }
    const data: Branch[] = (await this.fetch(`projects/${projectID}/repository/branches`, params, true)) || [];
    return data;
  }

  async getProjectTags(projectID: number, search?: string): Promise<{ name: string }[]> {
    const params: Record<string, string> = {};
    if (search && search.length > 0) {
      params.search = search;
    }
    const data: { name: string }[] = (await this.fetch(`projects/${projectID}/repository/tags`, params, true)) || [];
    return data;
  }

  async playJob(projectID: number, jobID: number): Promise<void> {
    await this.post(`projects/${projectID}/jobs/${jobID}/play`);
  }

  async cancelJob(projectID: number, jobID: number): Promise<void> {
    await this.post(`projects/${projectID}/jobs/${jobID}/cancel`);
  }

  async getJobTrace(projectID: number, jobID: number): Promise<string> {
    const fullUrl = `${this.url}/api/v4/projects/${projectID}/jobs/${jobID}/trace`;
    logAPI(`send GET request: ${fullUrl}`);
    const fetcher = this.getFetcher();
    const response = await fetcher(fullUrl, { method: "GET" });
    if (response.status === 404) {
      return "";
    }
    if (!response.ok) {
      throw new Error(`http status ${response.status}`);
    }
    return await response.text();
  }

  async getMyRecentPipelines(opts: { perProject?: number; maxProjects?: number } = {}): Promise<{
    projects: { project: Project; pipelines: any[] }[];
    scanned: number;
    inaccessible: number;
  }> {
    const perProject = opts.perProject ?? 5;
    const maxProjects = opts.maxProjects ?? 20;
    const projects = await this.getUserProjects(
      { membership: "true", order_by: "last_activity_at", min_access_level: "20" },
      false,
    );
    const limited = projects.filter((project) => !project.archived).slice(0, maxProjects);
    const fetcher = this.getFetcher();
    const results = await Promise.allSettled(
      limited.map(async (project) => {
        const url = `${this.url}/api/v4/projects/${project.id}/pipelines?per_page=${perProject}&order_by=updated_at`;
        const response = await fetcher(url, { method: "GET" });
        if (response.status === 404) throw new Error("Not found");
        if (response.status === 403) throw new Error("Forbidden");
        if (!response.ok) throw new Error(`http status ${response.status}`);
        const pipes = await response.json();
        return { project, pipelines: Array.isArray(pipes) ? pipes : [] };
      }),
    );
    const out: { project: Project; pipelines: any[] }[] = [];
    let inaccessible = 0;
    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.pipelines.length > 0) {
          out.push(result.value);
        }
      } else {
        const message = (result.reason?.message ?? `${result.reason}`) as string;
        if (message.includes("Not found") || message.includes("Forbidden") || message.includes("403")) {
          inaccessible++;
        }
      }
    }
    return { projects: out, scanned: limited.length, inaccessible };
  }
}

const REST_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

const getMyselfCached = withCache(
  async (gitlab: GitLab): Promise<User> => {
    const userdata = await gitlab.fetch("user");
    return userFromJson(userdata);
  },
  { maxAge: REST_CACHE_MAX_AGE_MS },
);

const fetchUserGroupsCached = withCache(
  async (gitlab: GitLab, params: Record<string, string>): Promise<Group[]> => {
    return ((await gitlab.fetch("groups", params, true)) as Group[]) || [];
  },
  { maxAge: REST_CACHE_MAX_AGE_MS },
);

export function searchData<Type>(
  data: any,
  params: { search: string; keys: string[]; limit: number; threshold?: number; ignoreLocation?: boolean },
): any {
  const options = {
    includeScore: true,
    threshold: params.threshold || 0.2,
    keys: params.keys,
    ignoreLocation: params.ignoreLocation || true,
  };
  const search = params.search;

  if (search && search.length > 0) {
    const fuse = new Fuse(data, options);
    const searchResult = fuse.search(search, { limit: params.limit });

    const items: Type[] = searchResult.map((result) => {
      return result.item as Type;
    });
    return items;
  } else {
    return data.map((result: any) => {
      return result as Type;
    });
  }
}

export const DefaultGitLab = new GitLab("https://gitlab.com", "");
