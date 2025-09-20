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
    author: maybeUserFromJson(issue.author),
    assignees: issue.assignees.map(userFromJson),
    project_id: issue.project_id,
    milestone: dataToMilestone(issue.milestone),
    labels: issue.labels as Label[],
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
  public project_id = 0;
  public milestone?: Milestone = undefined;
  public labels: Label[] = [];
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

export function isValidStatus(status: Status): boolean {
  if (status.message || status.emoji) {
    return true;
  }
  return false;
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

export class GitLab {
  public token: string;
  private url: string;
  constructor(url: string, token: string) {
    this.token = token;
    this.url = url;
  }

  private getFetcher() {
    return async (...args: Parameters<typeof fetch>) => {
      const [fullUrl, options] = args;
      const agent = getHttpAgent();

      return await fetch(fullUrl, {
        headers: {
          "Content-Type": "application/json",
          "PRIVATE-TOKEN": this.token,
        },
        agent: agent,
        ...options,
      });
    };
  }

  public joinUrl(relativeUrl: string): string {
    return new URL(relativeUrl, this.url).href;
  }

  public async fetch(url: string, params: { [key: string]: string } = {}, all = false): Promise<any> {
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
      if (s >= 200 && s < 300) {
        const json = await response.json();
        return json;
      } else if (s === 304) {
        // Not Modified
        // ignored
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
        let msg = `http status ${s}`;
        if (json.message) {
          // TODO better form error handling
          msg = JSON.stringify(json.message);
        }
        throw Error(msg);
      } else {
        logAPI("unknown error");
        throw Error(`http status ${s}`);
      }
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
    return await this.fetch("projects", params, all).then((projects: any[]) => {
      return projects.map((p: any) => dataToProject(p));
    });
  }

  async getProjects(args = { searchText: "", searchIn: "", membership: "true" }): Promise<Project[]> {
    const params: { [key: string]: string } = {};
    if (args.searchText) {
      params.search = args.searchText;
      params.in = args.searchIn || "title";
    }
    params.membership = args.membership;
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
    const user = await this.getMyself();
    const projects: Project[] = await this.fetch(`users/${user.id}/starred_projects`, params, all).then(
      (projects: any[]) => {
        return projects.map((p: any) => dataToProject(p));
      },
    );
    return projects;
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
