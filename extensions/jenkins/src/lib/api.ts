import fetch, { Headers } from "node-fetch";

export interface Jenkins {
  id: string;
  name: string;
  createTime?: number;
  updateTime?: number;
  version?: string;

  url: string;
  username: string;
  token?: string;
}

export interface Job {
  name: string;
  path: string;
  description?: string;
  url: string;
  _class: string;
  color: string;
}

export interface Build {
  number: number;
  url: string;
  _class: string;
}

export interface View {
  name: string;
  url: string;
  _class: string;
}

interface Response {
  _class: string;
  description: string;
  url: string;
  jobs?: Job[];
  builds?: Build[];
  views?: View[];
}

export class JenkinsAPI {
  public jenkins: Jenkins;

  constructor(j: Jenkins) {
    this.jenkins = j;
  }

  public async inspect(jobs?: string[]): Promise<Response> {
    let api = this.jenkins.url;
    if (jobs?.length) {
      api += "/" + jobs?.map((job) => `job/${job}`).join("/");
    }
    api += "/api/json";
    console.log(api);

    let headers: Headers | undefined = undefined;
    if (this.jenkins.token) {
      headers = new Headers();
      headers.append(
        "Authorization",
        "Basic " + Buffer.from(`${this.jenkins.username}:${this.jenkins.token}`).toString("base64")
      );
    }

    const resp = await fetch(api, {
      method: "GET",
      headers: headers,
    });
    if (!resp.ok) {
      if (resp.status === 403) {
        return Promise.reject(new Error("Invalid username ot token"));
      }
      return Promise.reject(`${resp.status} ${await resp.text()}`);
    }

    this.jenkins.version = resp.headers.get("X-Jenkins") ?? undefined;

    const result = (await resp.json()) as Response;
    result.jobs?.map((job) => {
      const parts = job.url.split("/");
      job.path = parts[parts.length - (job.url.endsWith("/") ? 2 : 1)];
      return job;
    });
    return result;
  }
}

export const hasSubJobs = (job: Job): boolean => {
  return (
    job._class === "org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject" ||
    job._class === "com.cloudbees.hudson.plugins.folder.Folder"
  );
};
