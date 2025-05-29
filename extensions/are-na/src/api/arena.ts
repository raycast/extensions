// This is a port of the original [arena-js](https://github.com/ivangreene/arena-js) to TypeScript, with some modifications to improve type safety and error handling.
import os from "node:os";
import { environment, showToast, Toast } from "@raycast/api";
import {
  Block,
  Channel,
  ChannelStatus,
  Group,
  Params,
  PaginationParams,
  SearchBlocksResponse,
  SearchChannelsResponse,
  GroupResponse,
  ChannelResponse,
  ArenaOptions,
  SearchUsersResponse,
  User,
} from "./types";
import { showFailureToast } from "@raycast/utils";

function pullObject<T>(key: string) {
  return (object: Record<string, unknown>): T => {
    if (!object || typeof object !== "object") {
      throw new Error(`Invalid object provided. Expected an object but received: ${object}`);
    }

    const extracted = object[key] as T;

    if (extracted === undefined) {
      throw new Error(`Key "${key}" not found in the provided object.`);
    }

    const attrs = { ...object };
    delete attrs[key];

    if (Array.isArray(extracted)) {
      Object.defineProperty(extracted, "attrs", {
        value: attrs,
        enumerable: false,
      });
      return extracted;
    }

    if (extracted && typeof extracted === "object") {
      Object.defineProperty(extracted, "attrs", {
        value: attrs,
        enumerable: false,
      });
    }

    return extracted;
  };
}

function arrayOrList<T>(list: T[]): T[] {
  if (list.length === 1 && Array.isArray(list[0])) {
    return list[0] as unknown as T[];
  }
  return list;
}

export class Arena {
  private baseURL: string;
  private headers: Record<string, string>;
  private requestHandler: (method: string, url: string, data: Params, options?: Params) => Promise<unknown>;

  constructor(config: ArenaOptions = {}) {
    this.baseURL = config.baseURL || "https://api.are.na/v2/";
    this.headers = {
      Accept: "*/*",
      "Content-Type": "application/json",
      "User-Agent": `Are.na Extension /Raycast/${environment.raycastVersion} (${os.type()} ${os.release()})`,
    };

    if (config.accessToken) {
      this.headers["Authorization"] = `Bearer ${config.accessToken}`;
    }
    if (config.authToken) {
      this.headers["X-AUTH-TOKEN"] = config.authToken;
    }
    this.requestHandler = config.requestHandler || this.defaultRequestHandler.bind(this);
  }

  private async defaultRequestHandler(method: string, url: string, data?: Params, options?: Params): Promise<unknown> {
    try {
      let fullUrl = `${this.baseURL}${url}`;
      const requestOptions: RequestInit = {
        method: method.toUpperCase(),
        headers: this.headers,
      };
      if (method.toLowerCase() === "get") {
        const query = { ...data, ...options } as Params;
        const queryObj: Record<string, string> = {};
        for (const [key, value] of Object.entries(query)) {
          queryObj[key] = String(value);
        }
        const paramsString = new URLSearchParams(queryObj).toString();
        if (paramsString) {
          fullUrl += `?${paramsString}`;
        }
      } else {
        // For non-GET methods, combine data and options in the request body.
        const bodyData = { ...data, ...options };
        requestOptions.body = JSON.stringify(bodyData);
      }
      const res = await fetch(fullUrl, requestOptions);
      if (!res.ok) {
        const errorText = await res.text();
        showToast({
          title: "Request failed",
          message: `Status: ${res.status}, Message: ${errorText}`,
          style: Toast.Style.Failure,
        });
        return null;
      }
      const responseData = await res.json();
      return responseData;
    } catch (error) {
      showFailureToast(error, {
        title: "Request error",
      });
      return null;
    }
  }

  private _req(method: string, url: string, ...data: Params[]): Promise<unknown> {
    const merged = Object.assign({}, ...data);
    return this.requestHandler(method.toLowerCase(), url, merged);
  }

  group(identifier: string, params?: Params): GroupResponse {
    return {
      get: (opts?: PaginationParams) =>
        this._req("GET", `groups/${identifier}`, params || {}, opts || {}) as Promise<Group>,
      channels: (opts?: PaginationParams) =>
        this._req("GET", `groups/${identifier}/channels`, params || {}, opts || {}).then((response) =>
          pullObject<Channel[]>("channels")(response as Record<string, unknown>),
        ),
    };
  }

  channel(identifier?: string | number, params?: Params): ChannelResponse {
    if (!identifier) identifier = "";
    return {
      get: (opts?: PaginationParams) =>
        this._req("GET", `channels/${identifier}`, params || {}, opts || {}) as Promise<Channel>,
      thumb: (opts?: Params) =>
        this._req("GET", `channels/${identifier}/thumb`, params || {}, opts || {}) as Promise<Channel>,
      connections: (opts?: PaginationParams) =>
        this._req("GET", `channels/${identifier}/connections`, params || {}, opts || {}).then((response) =>
          pullObject<Channel[]>("channels")(response as Record<string, unknown>),
        ),
      channels: (opts?: PaginationParams) =>
        this._req("GET", `channels/${identifier}/channels`, params || {}, opts || {}).then((response) =>
          pullObject<Channel[]>("channels")(response as Record<string, unknown>),
        ),
      contents: (opts?: PaginationParams) =>
        this._req("GET", `channels/${identifier}/contents`, params || {}, opts || {}).then((response) =>
          pullObject<Block[]>("contents")(response as Record<string, unknown>),
        ),
      collaborators: (opts?: PaginationParams) =>
        this._req("GET", `channels/${identifier}/collaborators`, params || {}, opts || {}).then((response) =>
          pullObject<User[]>("users")(response as Record<string, unknown>),
        ),
      create: (title: string, status: ChannelStatus) =>
        this._req("POST", `channels`, { ...params, title, status }) as Promise<Channel>,
      delete: (deleteSlug: string) => this._req("DELETE", `channels/${identifier || deleteSlug}`) as Promise<void>,
      update: (opts: { title?: string; status?: ChannelStatus }) =>
        this._req("PATCH", `channels/${identifier}`, { ...params, ...opts }) as Promise<Channel>,
      addCollaborators: (...userIDs: string[]) =>
        this._req("POST", `channels/${identifier}/collaborators`, { "ids[]": arrayOrList(userIDs) }).then((response) =>
          pullObject<User>("users")(response as Record<string, unknown>),
        ),
      deleteCollaborators: (...userIDs: string[]) =>
        this._req("DELETE", `channels/${identifier}/collaborators`, { "ids[]": arrayOrList(userIDs) }).then(
          (response) => pullObject<User[]>("users")(response as Record<string, unknown>),
        ),
      createBlock: (opts: { content: string; source?: string }) => {
        const blockOpts = { ...opts };
        if (blockOpts.content.match(/^https?:\/\//)) {
          blockOpts.source = blockOpts.content;
        }
        return this._req("POST", `channels/${identifier}/blocks`, blockOpts) as Promise<Block>;
      },
      deleteBlock: (blockID: string) =>
        this._req("DELETE", `channels/${identifier}/blocks/${blockID}`) as Promise<void>,
    };
  }

  user(id: string, params?: Params) {
    return {
      get: (opts?: Params) => this._req("GET", `users/${id}`, params || {}, opts || {}) as Promise<User>,
      channels: (opts?: PaginationParams) =>
        this._req("GET", `users/${id}/channels`, params || {}, opts || {}).then((response) =>
          pullObject<Channel[]>("channels")(response as Record<string, unknown>),
        ),
      followers: (opts?: PaginationParams) =>
        this._req("GET", `users/${id}/followers`, params || {}, opts || {}).then((response) =>
          pullObject<User[]>("users")(response as Record<string, unknown>),
        ),
      following: (opts?: PaginationParams) =>
        this._req("GET", `users/${id}/following`, params || {}, opts || {}).then((response) =>
          pullObject<User[]>("following")(response as Record<string, unknown>),
        ),
    };
  }

  block(id?: string | number, params?: Params) {
    if (!id) id = "";
    return {
      get: (opts?: Params) => this._req("GET", `blocks/${id}`, params || {}, opts || {}) as Promise<Block>,
      channels: (opts?: Params) =>
        this._req("GET", `blocks/${id}/channels`, params || {}, opts || {}).then((response) =>
          pullObject<Channel[]>("channels")(response as Record<string, unknown>),
        ),
      create: (channelSlug: string, content: { content: string }) => this.channel(channelSlug).createBlock(content),
      update: (opts: { content?: string; title?: string; description?: string }) =>
        this._req("PUT", `blocks/${id}`, { ...params, ...opts }) as Promise<void>,
    };
  }

  search(query: string, params?: Params) {
    return {
      all: (opts?: Params) =>
        this._req("GET", "search", { ...params, q: query }, opts || {}) as Promise<{
          channels?: Channel[];
          blocks?: Block[];
          users?: User[];
          term: string;
          total_pages: number;
          current_page: number;
          per: number;
        }>,
      users: (opts?: Params) =>
        this._req("GET", "search/users", { ...params, q: query }, opts || {}).then((response) => {
          const typedResponse = response as Record<string, unknown>;
          return {
            users: pullObject<User[]>("users")(typedResponse),
            term: typedResponse.term as string,
            total_pages: typedResponse.total_pages as number,
            current_page: typedResponse.current_page as number,
            per: typedResponse.per as number,
          } as SearchUsersResponse;
        }),
      channels: (opts?: Params) =>
        this._req("GET", "search/channels", { ...params, q: query }, opts || {}).then((response) => {
          const typedResponse = response as Record<string, unknown>;
          return {
            channels: pullObject<Channel[]>("channels")(typedResponse),
            term: typedResponse.term as string,
            total_pages: typedResponse.total_pages as number,
            current_page: typedResponse.current_page as number,
            per: typedResponse.per as number,
          } as SearchChannelsResponse;
        }),
      blocks: (opts?: Params) =>
        this._req("GET", "search/blocks", { ...params, q: query }, opts || {}).then((response) => {
          const typedResponse = response as Record<string, unknown>;
          return {
            blocks: pullObject<Block[]>("blocks")(typedResponse),
            term: typedResponse.term as string,
            total_pages: typedResponse.total_pages as number,
            current_page: typedResponse.current_page as number,
            per: typedResponse.per as number,
          } as SearchBlocksResponse;
        }),
    };
  }
}
