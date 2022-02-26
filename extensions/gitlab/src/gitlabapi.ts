import Fuse from "fuse.js";
import fetch, { Response } from "node-fetch";
import { receiveLargeCachedObject } from "./cache";
import { hashRecord } from "./utils";
import util from "util";
import fs from "fs";
import { pipeline } from "stream";
const streamPipeline = util.promisify(pipeline);

function userFromJson(data: any): User | undefined {
  if (!data) {
    // e.g. owners can be null, it seems that when there are multiple owners, then this field is null
    return undefined;
  }
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
    name_with_namespace: project.name_with_namespace,
    fullPath: project.path_with_namespace,
    web_url: project.web_url,
    star_count: project.star_count,
    fork_count: project.forks_count,
    last_activity_at: project.last_activity_at,
    readme_url: project.readme_url,
    avatar_url: project.avatar_url,
    owner: userFromJson(project.owner),
    ssh_url_to_repo: project.ssh_url_to_repo,
    http_url_to_repo: project.http_url_to_repo,
    default_branch: project.default_branch,
  };
}

export function jsonDataToMergeRequest(mr: any): MergeRequest {
  return {
    title: mr.title,
    web_url: mr.web_url,
    id: mr.id,
    iid: mr.iid,
    state: mr.state,
    updated_at: new Date(mr.updated_at),
    author: userFromJson(mr.author),
    project_id: mr.project_id,
    description: mr.description,
    reference_full: mr.references?.full,
    labels: mr.labels as Label[],
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
    updated_at: new Date(issue.updated_at),
    author: userFromJson(issue.author),
    project_id: issue.project_id,
    milestone: dataToMilestone(issue.milestone),
    labels: issue.labels as Label[],
  };
}

function paramString(params: { [key: string]: string }): string {
  const p: string[] = [];
  for (const k in params) {
    const v = encodeURI(params[k]);
    p.push(`${k}=${v}`);
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
  public updated_at = new Date(2000, 1, 1);
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
  public updated_at = new Date(2000, 1, 1);
  public project_id = 0;
  public reference_full = "";
  public labels: Label[] = [];
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
}

export class Project {
  public id = 0;
  public name_with_namespace = "";
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
}

export class User {
  public id = 0;
  public name = "";
  public username = "";
  public state = "";
  public avatar_url = "";
  public web_url = "";
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
  console.log(`status code: ${s}`);
  if (s >= 200 && s < 300) {
    const json = await response.json();
    return json;
  } else if (s == 401) {
    throw Error("Unauthorized");
  } else if (s == 403) {
    const json = await response.json();
    let msg = "Forbidden";
    if (json.error && json.error == "insufficient_scope") {
      msg = "Insufficient API token scope";
    }
    console.log(msg);
    throw Error(msg);
  } else if (s == 404) {
    throw Error("Not found");
  } else if (s >= 400 && s < 500) {
    const json = await response.json();
    console.log(json);
    const msg = json.message;
    throw Error(msg);
  } else {
    console.log("unknown error");
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

  public async fetch(url: string, params: { [key: string]: string } = {}, all = false): Promise<any> {
    const per_page = all ? 100 : 50;
    const fetchPage = async (page: number): Promise<Response> => {
      const pagedParams = { ...params, ...{ per_page: `${per_page}`, page: `${page}` } };
      const ps = paramString(pagedParams);
      const fullUrl = this.url + "/api/v4/" + url + ps;
      console.log(`send GET request: ${fullUrl}`);
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "PRIVATE-TOKEN": this.token,
        },
      });
      return response;
    };
    try {
      let page = 1;
      const response = await fetchPage(page);
      const json = await toJsonOrError(response);
      if (all) {
        const next_page = response.headers.get("x-next-page");
        if (next_page && next_page.length > 0) {
          console.log(next_page);
          page++;
          const jsonpage = await fetchPage(page);
          json.concat(jsonpage);
        }
      }
      return json;
    } catch (error: any) {
      throw Error(error); // rethrow error, otherwise raycast could not catch the error
    }
  }

  public async downloadFile(url: string, params: { localFilepath: string }): Promise<string> {
    console.log(`download ${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "PRIVATE-TOKEN": this.token,
      },
    });
    if (!response.ok) {
      throw new Error(`unexpected response ${response.statusText}`);
    }
    console.log(`write ${url} to ${params.localFilepath}`);
    await streamPipeline(response.body, fs.createWriteStream(params.localFilepath));
    return params.localFilepath;
  }

  public async post(url: string, params: { [key: string]: any } = {}) {
    const fullUrl = this.url + "/api/v4/" + url;
    console.log(`send POST request: ${fullUrl}`);
    console.log(params);
    try {
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PRIVATE-TOKEN": this.token,
        },
        body: JSON.stringify(params),
      });
      const s = response.status;
      console.log(`status code: ${s}`);
      if (s >= 200 && s < 300) {
        const json = await response.json();
        return json;
      } else if (s === 304) {
        // Not Modified
        // ignored
      } else if (s == 401) {
        throw Error("Unauthorized");
      } else if (s == 403) {
        const json = await response.json();
        let msg = "Forbidden";
        if (json.error && json.error == "insufficient_scope") {
          msg = "Insufficient API token scope";
        }
        console.log(msg);
        throw Error(msg);
      } else if (s == 404) {
        throw Error("Not found");
      } else if (s >= 400 && s < 500) {
        const json = await response.json();
        console.log(json);
        let msg = `http status ${s}`;
        if (json.message) {
          // TODO better form error handling
          msg = JSON.stringify(json.message);
        }
        throw Error(msg);
      } else {
        console.log("unknown error");
        throw Error(`http status ${s}`);
      }
    } catch (e: any) {
      console.log(`catch error: ${e}`);
      throw Error(e.message); // rethrow error, otherwise raycast could not catch the error
    }
  }

  public async put(url: string, params: { [key: string]: any } = {}) {
    const fullUrl = this.url + "/api/v4/" + url;
    console.log(`send PUT request: ${fullUrl}`);
    console.log(params);
    try {
      const response = await fetch(fullUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "PRIVATE-TOKEN": this.token,
        },
        body: JSON.stringify(params),
      });
      await toJsonOrError(response);
    } catch (e: any) {
      console.log(`catch error: ${e}`);
      throw Error(e.message); // rethrow error, otherwise raycast could not catch the error
    }
  }

  async getIssues(params: Record<string, any>, project?: Project): Promise<Issue[]> {
    const projectPrefix = project ? `projects/${project.id}/` : "";
    if (!params.with_labels_details) {
      params.with_labels_details = "true";
    }
    const issueItems: Issue[] = await this.fetch(`${projectPrefix}issues`, params).then((issues) => {
      return issues.map((issue: any, index: number) => jsonDataToIssue(issue));
    });
    return issueItems;
  }

  async getGroupIssues(params: Record<string, any>, groupID: number): Promise<Issue[]> {
    if (!params.with_labels_details) {
      params.with_labels_details = "true";
    }
    const issueItems: Issue[] = await this.fetch(`groups/${groupID}/issues`, params).then((issues) => {
      return issues.map((issue: any, index: number) => jsonDataToIssue(issue));
    });
    return issueItems;
  }

  async createIssue(projectID: number, data: { [key: string]: any }) {
    await this.post(`projects/${projectID}/issues`, data);
  }

  async createMR(projectID: number, data: { [key: string]: any }) {
    await this.post(`projects/${projectID}/merge_requests`, data);
  }

  async getProjectMember(projectId: number): Promise<User[]> {
    const userItems: User[] = await this.fetch(`projects/${projectId}/users`).then((users) => {
      return users.map((userdata: any, index: number) => ({
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
      return labels.map((data: any, index: number) => ({
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
      return labels.map((data: any, index: number) => ({
        id: data.id,
        title: data.title,
      }));
    });
    return items;
  }

  async getGroupMilestones(group: Group): Promise<Milestone[]> {
    const items: Milestone[] = await this.fetch(`groups/${group.id}/milestones`).then((labels) => {
      return labels.map((data: any, index: number) => ({
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

  async getProjects(args = { searchText: "", searchIn: "" }): Promise<Project[]> {
    const params: { [key: string]: string } = {};
    if (args.searchText) {
      params.search = args.searchText;
      params.in = args.searchIn || "title";
    }
    const issueItems: Project[] = await this.fetch("projects", params).then((projects) => {
      return projects.map((project: any, index: number) => dataToProject(project));
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
      }
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
      return users.map((userdata: any, index: number) => ({
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
      return issues.map((issue: any, _: number) => jsonDataToMergeRequest(issue));
    });
    return issueItems;
  }

  async getGroupMergeRequests(params: Record<string, any>, group: Group): Promise<MergeRequest[]> {
    if (!params.with_labels_details) {
      params.with_labels_details = "true";
    }
    const issueItems: MergeRequest[] = await this.fetch(`groups/${group.id}/merge_requests`, params).then((issues) => {
      return issues.map((issue: any, _: number) => jsonDataToMergeRequest(issue));
    });
    return issueItems;
  }

  async getTodos(params: Record<string, any>): Promise<Todo[]> {
    const issueItems: Todo[] = await this.fetch("todos", params).then((issues) => {
      return issues.map((issue: any, _: number) => ({
        title: issue.target.title,
        action_name: issue.action_name,
        target_url: issue.target_url,
        target_type: issue.target_type,
        target: issue.target,
        id: issue.id,
        project_with_namespace: issue.project ? issue.project.name_with_namespace : undefined,
        group: issue.group ? (issue.group as TodoGroup) : undefined,
        author: userFromJson(issue.author),
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

  async getUserGroups(params: Record<string, any> = {}): Promise<any> {
    if (!params.min_access_level) {
      params.min_access_level = "30";
    }
    const search = params.search;
    delete params.search;

    const dataAll: Group[] = await receiveLargeCachedObject(hashRecord(params, "mygroups"), async () => {
      return ((await this.fetch(`groups`, params, true)) as Group[]) || [];
    });
    return await searchData<Group>(dataAll, { search: search, keys: ["title"], limit: 50 });
  }

  async getUserEpics(params: Record<string, any> = {}): Promise<Epic[]> {
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

    params.include_ancestor_groups = false;
    params.include_descendant_groups = false;

    const groups = await this.getUserGroups();
    const epics: Epic[] = [];
    for (const g of groups) {
      try {
        const data = (await this.fetch(`groups/${g.id}/epics`, params, true)) || [];
        for (const e of data) {
          epics.push(e);
        }
      } catch (e: any) {
        console.log("skip during error");
      }
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

export async function searchData<Type>(
  data: any,
  params: { search: string; keys: string[]; limit: number; threshold?: number; ignoreLocation?: boolean }
) {
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
