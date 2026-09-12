import fetch, { Headers, RequestInfo, RequestInit } from "node-fetch";
import http from "http";
import https from "https";

export interface Jenkins {
  id: string;
  name: string;
  createTime?: number;
  updateTime?: number;
  version?: string;

  url: string;
  username: string;
  token?: string;
  unsafeHttps: boolean;
}

export interface Job {
  name: string;
  path?: string;
  description?: string;
  url: string;
  _class?: string;
  color?: string;
  shortClass?: string;
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

interface InspectResponse {
  _class: string;
  description: string;
  url: string;
  jobs?: Job[];
  builds?: Build[];
  views?: View[];
}

export interface Suggestion {
  name: string;
  url: string;
}

export interface SearchResponse {
  _class: string;
  suggestions: Suggestion[];
}

export class JenkinsAPI {
  public jenkins: Jenkins;

  constructor(j: Jenkins) {
    this.jenkins = j;
  }

  public async inspect(jobs?: string[]): Promise<InspectResponse> {
    let api = this.jenkins.url;
    if (jobs?.length) {
      api += "/" + jobs?.map((job) => (job ? `job/${job}` : "")).join("/");
    }
    api += "/api/json";
    const resp = await this.request(api);
    this.jenkins.version = resp.headers.get("X-Jenkins") ?? undefined;
    const result = (await resp.json()) as InspectResponse;
    result.jobs?.map((job) => {
      const urlParts = job.url.split("/");
      job.path = urlParts[urlParts.length - (job.url.endsWith("/") ? 2 : 1)];

      if (job._class) {
        const classParts = job._class.split(".");
        job.shortClass = classParts[classParts.length - 1];
      }
      return job;
    });
    return result;
  }

  public async search(q: string): Promise<Suggestion[]> {
    const api = `${this.jenkins.url}/search/suggest?query=${q}`;
    const resp = await this.request(api);
    const result = (await resp.json()) as SearchResponse;

    return result.suggestions.map((s) => {
      // use the suggestion URL if Jenkins provided one, construct our own if not
      const suggestionUrl = s.url || `/search/?q=${encodeURIComponent(s.name)}`;

      s.url = `${this.jenkins.url}${suggestionUrl}`;

      return s;
    });
  }

  public async build(job: Job) {
    const api = `${job.url}build`;
    const resp = await this.request(api, {
      method: "POST",
    });
    if (resp.status !== 201) {
      return Promise.reject(new Error(`${resp.status} ${await resp.text()}`));
    }
  }

  async request(url: RequestInfo, init?: RequestInit) {
    let urlAgent;
    if (url.toString().startsWith("http://")) {
      urlAgent = new http.Agent({});
    } else if (url.toString().startsWith("https://")) {
      urlAgent = new https.Agent({ rejectUnauthorized: !this.jenkins.unsafeHttps });
    } else {
      return Promise.reject(new Error("Wrong scheme in URL"));
    }

    let headers: Headers | undefined = undefined;
    if (this.jenkins.token) {
      headers = new Headers();
      headers.append(
        "Authorization",
        "Basic " + Buffer.from(`${this.jenkins.username}:${this.jenkins.token}`).toString("base64")
      );
    }
    const resp = await fetch(url, {
      headers,
      method: "GET",
      agent: urlAgent,
      ...init,
    });
    if (!resp.ok) {
      if (resp.status === 403) {
        return Promise.reject(new Error("Invalid username or token"));
      }
      return Promise.reject(`${resp.status} ${await resp.text()}`);
    }
    return resp;
  }
}

export const hasSubJobs = (job: Job): boolean => {
  return (
    job._class === "org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject" ||
    job._class === "com.cloudbees.hudson.plugins.folder.Folder"
  );
};
