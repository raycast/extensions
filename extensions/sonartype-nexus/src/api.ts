import fetch, { Response } from "node-fetch";

export interface NexusPageResult<T> {
  continuationToken?: string;
  items: T[];
}

export interface NexusChecksum {
  md5: string;
  sha1: string;
}

export interface NexusAsset {
  checksum: NexusChecksum;
  downloadUrl: string;
  format: string;
  id: string;
  path: string;
  repository: string;
}

export interface NexusComponent {
  assets: NexusAsset[];
  format: string;
  group: string;
  id: string;
  name: string;
  repository: string;
  version: string;
}

export interface NexusRepository {
  name: string;
  format: string;
  type: string;
  url: string;
  attributes: any;
}

export class Nexus {
  constructor(url: string) {
    // use http if no schema
    if (!url.startsWith("http://") || !url.startsWith("https://")) {
      this.url = "http://" + url;
    } else {
      this.url = url;
    }
  }

  private url: string;

  public async fetchPage(
    url: string,
    params: { [key: string]: string } = {},
    continuationToken?: string
  ): Promise<NexusPageResult<any>> {
    const pagedParams = { ...params, ...(continuationToken ? { continuationToken } : {}) };
    const ps = paramString(pagedParams);
    const fullUrl = this.url + "/service/rest/v1" + url + ps;
    logAPI(`send GET request: ${fullUrl}`);
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return await toJsonOrError(response);
  }

  public async fetchAllPage(url: string, params: { [key: string]: string } = {}): Promise<any[]> {
    try {
      let result: any[] = [];

      let page_response = await this.fetchPage(url, params);
      result = result.concat(page_response.items);
      let continuationToken = page_response.continuationToken;
      while (continuationToken) {
        logAPI(continuationToken);
        page_response = await this.fetchPage(url, params, continuationToken);
        result = result.concat(page_response.items);
        continuationToken = page_response.continuationToken;
      }
      return result;
    } catch (error: any) {
      throw Error(error); // rethrow error, otherwise raycast could not catch the error
    }
  }

  public async fetch(url: string, params: { [key: string]: string } = {}): Promise<any> {
    const ps = paramString(params);
    const fullUrl = this.url + "/service/rest/v1" + url + ps;
    logAPI(`send GET request: ${fullUrl}`);
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return await toJsonOrError(response);
  }

  public async searchAllComponents(params: { [key: string]: string } = {}): Promise<NexusComponent[]> {
    return (await this.fetchAllPage("/search", params)) as NexusComponent[];
  }

  public async searchComponents(params: { [key: string]: string } = {}): Promise<NexusPageResult<NexusComponent>> {
    return (await this.fetchPage("/search", params)) as unknown as NexusPageResult<NexusComponent>;
  }

  public async getRepositories(): Promise<NexusRepository[]> {
    return (await this.fetch("/repositories")) as NexusRepository[];
  }

  public getComponentWebUrl({ group, name, version, repository }: NexusComponent): string {
    const path = group ? `${group.replaceAll(".", "/")}/${name}/${version}` : `${name}/${version}`;
    return `${this.url}/#browse/browse:${repository}:${encodeURIComponent(path)}`;
  }
}

const activateAPILogging = true;

export function logAPI(message?: any, ...optionalParams: any[]) {
  if (activateAPILogging) {
    console.log(message, ...optionalParams);
  }
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

async function toJsonOrError(response: Response): Promise<any> {
  const s = response.status;
  logAPI(`status code: ${s}`);
  if (s >= 200 && s < 300) {
    const json = await response.json();
    return json;
  } else if (s == 401) {
    throw Error("Unauthorized");
  } else if (s == 403) {
    const json: any = await response.json();
    let msg = "Forbidden";
    if (json.error && json.error == "insufficient_scope") {
      msg = "Insufficient API token scope";
    }
    logAPI(msg);
    throw Error(msg);
  } else if (s == 404) {
    throw Error("Not found");
  } else if (s >= 400 && s < 500) {
    const json: any = await response.json();
    logAPI(json);
    const msg = json.message;
    throw Error(msg);
  } else {
    logAPI("unknown error");
    throw Error(`http status ${s}`);
  }
}

export function convertApiException(title: string, e: any) {
  if (e.code === "ERR_INVALID_URL") {
    const err = new Error("did you set the correct instance url?");
    err.name = title;
    return err;
  }

  const err = new Error(e);
  err.name = title;
  return err;
}
