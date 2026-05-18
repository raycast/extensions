import Fuse from "fuse.js";
import fetch, { Response } from "node-fetch";
import { receiveLargeCachedObject } from "./cache";
import { hashRecord } from "./utils";
import util from "util";
import fs from "fs";
import { pipeline } from "stream";
const streamPipeline = util.promisify(pipeline);
import https from "https";
import { getPreferenceValues } from "@raycast/api";

function readCACertFileSync(filename: string): Buffer | undefined {
  try {
    const data = fs.readFileSync(filename);
    return data;
  } catch (e) {
    throw Error(`Could not read CA cert file ${filename} ${e}`);
  }
}

function readCertFileSync(filename: string): Buffer | undefined {
  try {
    const data = fs.readFileSync(filename);
    return data;
  } catch (e) {
    throw Error(`Could not read cert file ${filename} ${e}`);
  }
}

export function getHttpAgent(): https.Agent | undefined {
  let agent: https.Agent | undefined;
  const preferences = getPreferenceValues();
  const ignoreCertificates = (preferences.ignorecerts as boolean) || false;
  const customcacert = (preferences.customcacert as string) || "";
  const customcert = (preferences.customcert as string) || "";
  if (ignoreCertificates || customcacert.length > 0 || customcert.length > 0) {
    const ca = customcacert.length > 0 ? readCACertFileSync(customcacert) : undefined;
    const cert = customcert.length > 0 ? readCertFileSync(customcert) : undefined;
    const opt: https.AgentOptions = { rejectUnauthorized: !ignoreCertificates, ca: ca, cert: cert };
    agent = new https.Agent(opt);
  }
  return agent;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const activateAPILogging = false;

export function logAPI(message?: any, ...optionalParams: any[]) {
  if (activateAPILogging) {
    console.log(message, ...optionalParams);
  }
}

function maybeUserFromJson(data: any): User | undefined {
  return data ? userFromJson(data) : undefined;
}

function userFromJson(data: any): User {
  return {
    id: data.id,
    name: data.name,
    username: data.username,
    web_url: data.web_url,
    avatar_url: data.avatar_url,
    state: data.state,
  };
}

export function dataToProject(project: any): Project {
  return {
    id: project.id,
    group_id: project.namespace.kind == "group" ? project.namespace.id : 0,
    name: project.name,
    name_with_namespace: project.name_with_namespace,
    fullPath: project.path_with_namespace,
    web_url: project.web_url,
    star_count: project.star_count,
    fork_count: project.forks_count,
    last_activity_at: project.last_activity_at,
    readme_url: project.readme_url,
    avatar_url: project.avatar_url,
    owner: maybeUserFromJson(project.owner),
    ssh_url_to_repo: project.ssh_url_to_repo,
    http_url_to_repo: project.http_url_to_repo,
    default_branch: project.default_branch,
    archived: project.archived,
    remove_source_branch_after_merge: project.remove_source_branch_after_merge,
  };
}

export function jsonDataToMergeRequest(mr: any): MergeRequest {
  return {
    title: mr.title,
    web_url: mr.web_url,
    id: mr.id,
    iid: mr.iid,
    state: mr.state,
    updated_at: mr.updated_at,
    author: maybeUserFromJson(mr.author),
    assignees: mr.assignees.map(userFromJson),
    reviewers: mr.reviewers?.map(userFromJson) || [],
    project_id: mr.project_id,
    description: mr.description,
    reference_full: mr.references?.full,
    labels: mr.labels as Label[],
    source_branch: mr.source_branch,
    target_branch: mr.target_branch,
    merge_commit_sha: mr.merge_commit_sha,
    sha: mr.sha,
    milestone: mr.milestone ? (mr.milestone as Milestone) : undefined,
    draft: mr.draft,
    has_conflicts: mr.has_conflicts === true || false,
    force_remove_source_branch: mr.force_remove_source_branch,
    squash_on_merge: mr.squash_on_merge,
    merge_when_pipeline_succeeds: mr.merge_when_pipeline_succeeds,
    user_notes_count: mr.user_notes_count,
  };
}

export function jsonDataToIssue(issue: any): Issue {
  const dataToMilestone = (data: any): Milestone | undefined => {
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
    description: issue.description,
    web_url: issue.web_url,
    id: issue.id,
    iid: issue.iid,
    reference_full: issue.references?.full,
    state: issue.state,
    updated_at: issue.updated_at,
    created_at: issue.created_at,
    author: maybeUserFromJson(issue.author),
    assignees: issue.assignees.map(userFromJson),
    project_id: issue.project_id,
    milestone: dataToMilestone(issue.milestone),
    labels: issue.labels as Label[],
    user_notes_count: issue.user_notes_count,
    merge_requests_count: issue.merge_requests_count,
  };
}

/**
 * Converts a params object to a query string, supporting arrays and nested keys (e.g., labels[], not[labels][]).
 * - Arrays are output as multiple key[]=value pairs.
 * - Nested keys (e.g., not[labels][]) are supported if the key is in the form 'not[labels][]'.
 */
function paramString(params: { [key: string]: any }): string {
  const p: string[] = [];
  for (const k in params) {
    const v = params[k];
    if (Array.isArray(v)) {
      for (const item of v) {
        p.push(`${encodeURIComponent(k)}=${encodeURIComponent(item)}`);
      }
    } else {
      p.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  }
  let prefix = "";
  if (p.length > 0) {
    prefix = "?";
  }
  return prefix + p.join("&");
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
}

export interface Epic {
  id: number;
  iid: number;
  group_id: number;
  title: string;
  state: string;
  web_url: string;
  author?: any;
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

export class MergeRequest {
  public title = "";
  public description = "";
  public web_url = "";
  public id = 0;
  public iid = 0;
  public state = "";
  public author: User | undefined;
  public assignees: User[] = [];
  public reviewers: User[] = [];
  public updated_at = "";
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

/**
 * Returns true when the request body can be safely replayed after a 401.
 * Streams and FormData are consumed by the first send and cannot be reused.
 */
function isReplayableBody(body: unknown): boolean {
  if (body == null) return true;
  const b = body as { pipe?: unknown; read?: unknown; getBuffer?: unknown; getBoundary?: unknown };
  if (typeof b.pipe === "function" || typeof b.read === "function") return false;
  if (typeof b.getBuffer === "function" && typeof b.getBoundary === "function") return false;
  return true;
}

async function toJsonOrError(response: Response): Promise<any> {
  const s = response.status;
  logAPI(`status code: ${s}`);
  if (s >= 200 && s < 300) {
    const json = await response.json();
    return json;
  } else if (s == 401) {
    throw Error("Unauthorized");
  } else if (s == 403) {
    const json = (await response.json()) as any;
    let msg = "Forbidden";
    if (json.error && json.error == "insufficient_scope") {
      msg = "Insufficient API token scope";
    }
    logAPI(msg);
    throw Error(msg);
  } else if (s == 404) {
    throw Error("Not found");
  } else if (s >= 400 && s < 500) {
    const json = (await response.json()) as any;
    logAPI(json);
    const msg = json.message;
    throw Error(msg);
  } else {
    logAPI("unknown error");
    throw Error(`http status ${s}`);
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
          return await send(fresh);
        } catch {
          return response;
        }
      }
      return response;
    };
  }

  public joinUrl(relativeUrl: string): string {
    return new URL(relativeUrl, this.url).href;
  }

  public async fetch(
    url: string,
    params: { [key: string]: string } = {},
    all = false,
    mapPage?: (items: any[]) => any[],
  ): Promise<any> {
    const per_page = all ? 100 : 50;
    const fetchPage = async (page: number): Promise<Response> => {
      const pagedParams = { ...params, ...{ per_page: `${per_page}`, page: `${page}` } };
      const ps = paramString(pagedParams);
      const fullUrl = this.url + "/api/v4/" + url + ps;
      logAPI(`send GET request: ${fullUrl}`);
      const fetcher = this.getFetcher();
      const response = await fetcher(fullUrl, {
        method: "GET",
      });
      return response;
    };

    const processPage = async (r: Response): Promise<any[]> => {
      const items = await toJsonOrError(r);
      return mapPage ? mapPage(items) : items;
    };

    try {
      const response = await fetchPage(1);
      const json = await processPage(response);
      if (!all) {
        return json;
      }

      const totalPages = parseInt(response.headers.get("x-total-pages") || "1");

      if (totalPages > 1) {
        const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        const BATCH_SIZE = 5;

        for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
          const batch = remainingPages.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(
            batch.map(async (page) => {
              try {
                return await processPage(await fetchPage(page));
              } catch (firstError) {
                logAPI(`page ${page} failed, retrying: ${firstError}`);
                try {
                  return await processPage(await fetchPage(page));
                } catch (retryError) {
                  throw Error(`page ${page} failed after retry: ${retryError} (original: ${firstError})`);
                }
              }
            }),
          );
          for (const pageContent of results) {
            json.push(...pageContent);
          }
        }
      }

      return json;
    } catch (error: any) {
      throw Error(error); // rethrow error, otherwise raycast could not catch the error
    }
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
      const s = response.status;
      logAPI(`status code: ${s}`);
      if (s === 204 || s === 304) {
        return;
      }

      if (s >= 200 && s < 300) {
        return await response.json();
      }

      if (s === 401) {
        throw Error("Unauthorized");
      }

      if (s === 403) {
        const json = (await response.json()) as any;
        let msg = "Forbidden";
        if (json.error && json.error == "insufficient_scope") {
          msg = "Insufficient API token scope";
        }
        logAPI(msg);
        throw Error(msg);
      }

      if (s === 404) {
        throw Error("Not found");
      }

      if (s >= 400 && s < 500) {
        const json = (await response.json()) as any;
        logAPI(json);
        let msg = `http status ${s}`;
        if (json.message) {
          // TODO better form error handling
          msg = JSON.stringify(json.message);
        }
        throw Error(msg);
      }

      logAPI("unknown error");
      throw Error(`http status ${s}`);
    } catch (e: any) {
      logAPI(`catch error: ${e}`);
      throw Error(e.message); // rethrow error, otherwise raycast could not catch the error
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
    } catch (e: any) {
      logAPI(`catch error: ${e}`);
      throw Error(e.message); // rethrow error, otherwise raycast could not catch the error
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
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);
      if (includeArr.length > 0) {
        params["labels[]"] = includeArr;
      }
      delete params.includeLabels;
    }
    if (params.excludeLabels) {
      const excludeArr = params.excludeLabels
        .split(",")
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);
      if (excludeArr.length > 0) {
        params["not[labels][]"] = excludeArr;
      }
      delete params.excludeLabels;
    }

    if (!params.with_labels_details) {
      params.with_labels_details = "true";
    }

    const issueItems: Issue[] = await this.fetch(`${projectPrefix}issues`, params, all).then((issues) => {
      return issues.map((issue: any) => jsonDataToIssue(issue));
    });
    return issueItems;
  }

  async getIssue(projectID: number, issueID: number, params: Record<string, any>): Promise<Issue> {
    if (!params.with_labels_details) {
      params.with_labels_details = "true";
    }
    const projectPrefix = `projects/${projectID}/issues/${issueID}`;
    const result: Issue = await this.fetch(`${projectPrefix}`, params).then((issue) => {
      return jsonDataToIssue(issue);
    });
    return result;
  }

  async getGroupIssues(params: Record<string, any>, groupID: number): Promise<Issue[]> {
    if (!params.with_labels_details) {
      params.with_labels_details = "true";
    }
    const issueItems: Issue[] = await this.fetch(`groups/${groupID}/issues`, params).then((issues) => {
      return issues.map((issue: any) => jsonDataToIssue(issue));
    });
    return issueItems;
  }

  async createIssue(projectID: number, data: { [key: string]: any }): Promise<void> {
    await this.post(`projects/${projectID}/issues`, data);
  }

  async createMR(projectID: number, data: { [key: string]: any }): Promise<void> {
    await this.post(`projects/${projectID}/merge_requests`, data);
  }

  async getProjectMember(projectId: number): Promise<User[]> {
    const userItems: User[] = await this.fetch(`projects/${projectId}/users`, {}, true).then((users) => {
      return users.map((userdata: any) => ({
        id: userdata.id,
        name: userdata.name,
        username: userdata.username,
        web_url: userdata.web_url,
        avatar_url: userdata.avatar_url,
        state: userdata.state,
      }));
    });
    return userItems;
  }

  async getProjectLabels(projectId: number): Promise<Label[]> {
    const items: Label[] = await this.fetch(`projects/${projectId}/labels`, {}, true).then((labels) => {
      return labels.map((data: any) => ({
        id: data.id,
        name: data.name,
        color: data.color,
        textColor: data.text_color,
        description: data.description,
        subscribed: data.subscribed || undefined,
      }));
    });
    return items;
  }

  async getProjectMilestones(projectId: number): Promise<Milestone[]> {
    const items: Milestone[] = await this.fetch(`projects/${projectId}/milestones`).then((labels) => {
      return labels.map((data: any) => ({
        id: data.id,
        title: data.title,
      }));
    });
    return items;
  }

  async getProjectMergeRequestTemplates(projectId: number): Promise<TemplateSummary[]> {
    const items: TemplateSummary[] = await this.fetch(`projects/${projectId}/templates/merge_requests`).then(
      (templates) => {
        return templates.map((template: any) => ({
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
      return {
        name: template.name,
        content: template.content,
      };
    });
    return item;
  }

  async getGroupMilestones(group: Group): Promise<Milestone[]> {
    const items: Milestone[] = await this.fetch(`groups/${group.id}/milestones`).then((labels) => {
      return labels.map((data: any) => ({
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
    if (!params.order_by) {
      params.order_by = "last_activity_at";
      params.sort = "desc";
    }
    const mapFn = (items: any[]) => items.map((p: any) => dataToProject(p));
    return await this.fetch("projects", params, all, mapFn);
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
      return projects.map((project: any) => dataToProject(project));
    });
    return issueItems;
  }

  async getProject(projectID: number): Promise<Project> {
    const pro: Project = await this.fetch(`projects/${projectID}`).then((project) => {
      return dataToProject(project);
    });
    return pro;
  }

  async getStarredProjects(args = { searchText: "", searchIn: "" }, all: boolean): Promise<Project[]> {
    const params: { [key: string]: string } = {};
    if (args.searchText && args.searchText.length > 0) {
      params.searchText = args.searchText;
    }
    if (args.searchIn && args.searchIn.length > 0) {
      params.searchIn = args.searchIn;
    }
    params.order_by = "last_activity_at";
    params.sort = "desc";
    const user = await this.getMyself();
    const mapFn = (items: any[]) => items.map((p: any) => dataToProject(p));
    return await this.fetch(`users/${user.id}/starred_projects`, params, all, mapFn);
  }

  async getUsers(args = { searchText: "", searchIn: "" }): Promise<User[]> {
    const params: { [key: string]: string } = {};
    if (args.searchText) {
      params.search = args.searchText;
      params.in = args.searchIn || "title";
    }
    const userItems: User[] = await this.fetch("users", params).then((users) => {
      return users.map((userdata: any) => ({
        id: userdata.id,
        name: userdata.name,
        username: userdata.username,
        web_url: userdata.web_url,
        avatar_url: userdata.avatar_url,
        state: userdata.state,
      }));
    });
    return userItems;
  }

  async getMergeRequests(params: Record<string, any>, project?: Project): Promise<MergeRequest[]> {
    if (!params.with_labels_details) {
      params.with_labels_details = "true";
    }
    const projectPrefix = project ? `projects/${project.id}/` : "";
    const issueItems: MergeRequest[] = await this.fetch(`${projectPrefix}merge_requests`, params).then((issues) => {
      return issues.map((issue: any) => jsonDataToMergeRequest(issue));
    });
    return issueItems;
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

  async getMergeRequest(projectID: number, mrID: number, params: Record<string, any>): Promise<MergeRequest> {
    if (!params.with_labels_details) {
      params.with_labels_details = "true";
    }
    const projectPrefix = `projects/${projectID}/merge_requests/${mrID}`;
    const result: MergeRequest = await this.fetch(`${projectPrefix}`, params).then((mr) => {
      return jsonDataToMergeRequest(mr);
    });
    return result;
  }

  async getGroupMergeRequests(params: Record<string, any>, group: Group): Promise<MergeRequest[]> {
    if (!params.with_labels_details) {
      params.with_labels_details = "true";
    }
    const issueItems: MergeRequest[] = await this.fetch(`groups/${group.id}/merge_requests`, params).then((issues) => {
      return issues.map((issue: any) => jsonDataToMergeRequest(issue));
    });
    return issueItems;
  }

  async getTodos(params: Record<string, any>, all?: boolean): Promise<Todo[]> {
    const issueItems: Todo[] = await this.fetch("todos", params, all).then((issues) => {
      return issues.map((issue: any) => ({
        title: issue.target.title,
        action_name: issue.action_name,
        target_url: issue.target_url,
        target_type: issue.target_type,
        target: issue.target,
        id: issue.id,
        project_with_namespace: issue.project ? issue.project.name_with_namespace : undefined,
        group: issue.group ? (issue.group as TodoGroup) : undefined,
        author: maybeUserFromJson(issue.author),
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      }));
    });

    if (params.search) {
      const lowerSearch = params.search.toLowerCase();
      const filtered = issueItems.filter((t: Todo) => {
        return t.title.toLowerCase().includes(lowerSearch);
      });
      return filtered;
    }
    return issueItems;
  }

  async getMyself(): Promise<User> {
    const user: User = await receiveLargeCachedObject("user", async () => {
      const user: User = await this.fetch("user").then((userdata) => {
        return {
          id: userdata.id,
          name: userdata.name,
          username: userdata.username,
          web_url: userdata.web_url,
          avatar_url: userdata.avatar_url,
          state: userdata.state,
        };
      });
      return user;
    });
    return user;
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
    if (!params.min_access_level) {
      params.min_access_level = "30";
    }
    const search = params.search;
    delete params.search;

    const dataAll: Group[] = await receiveLargeCachedObject(hashRecord(params, "usergroups"), async () => {
      return ((await this.fetch(`groups`, params as Record<string, any>, true)) as Group[]) || [];
    });
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
      } catch (e: any) {
        logAPI(`skip during error ${e}`);
        return [];
      }
    }

    const groups = await this.getUserGroups({ top_level_only: true });
    const epics: Epic[] = [];
    for (const g of groups) {
      try {
        const data = (await this.fetch(`groups/${g.id}/epics`, params as Record<string, any>, true)) || [];
        for (const e of data) {
          epics.push(e);
        }
      } catch (e: any) {
        logAPI(`skip during error ${e}`);
      }
    }
    if (params.include_ancestor_groups === true && !groupid) {
      return epics.filter((e, i, a) => a.findIndex((t) => t.id === e.id) === i) || [];
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
      body.variables = variables.map((v) => ({ key: v.key, value: v.value, variable_type: "env_var" }));
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
    const limited = projects.filter((p) => !p.archived).slice(0, maxProjects);
    // Use getFetcher() directly so per_page is honoured — this.fetch() always overrides per_page.
    const fetcher = this.getFetcher();
    const results = await Promise.allSettled(
      limited.map(async (p) => {
        const url = `${this.url}/api/v4/projects/${p.id}/pipelines?per_page=${perProject}&order_by=updated_at`;
        const response = await fetcher(url, { method: "GET" });
        if (response.status === 404) throw new Error("Not found");
        if (response.status === 403) throw new Error("Forbidden");
        if (!response.ok) throw new Error(`http status ${response.status}`);
        const pipes = await response.json();
        return { project: p, pipelines: Array.isArray(pipes) ? pipes : [] };
      }),
    );
    const out: { project: Project; pipelines: any[] }[] = [];
    let inaccessible = 0;
    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value.pipelines.length > 0) {
          out.push(r.value);
        }
      } else {
        const msg = (r.reason?.message ?? `${r.reason}`) as string;
        if (msg.includes("Not found") || msg.includes("Forbidden") || msg.includes("403")) {
          inaccessible++;
        }
      }
    }
    return { projects: out, scanned: limited.length, inaccessible };
  }
}

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
