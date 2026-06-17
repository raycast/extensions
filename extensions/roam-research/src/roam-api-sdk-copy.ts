// Forked from https://github.com/Roam-Research/backend-sdks/blob/0933181963e8c2eb7403bdbbe9a7885e0ea2abc7/typescript/src/index.ts
// Changes from upstream:
//   1. importing fetch and Request from "cross-fetch" node module
//   2. Changed `q`'s `args` param's type from `string[]` to `any[]`
//   3. Uses proxy.api.roamresearch.com (CloudFront reverse proxy) instead of api.roamresearch.com
//   4. Other multiple changes have been made, will want to take a code diff later and move stuff to roam-api-sdk we want for everyone

import { fetch, Request } from "cross-fetch";

interface APICall<Response> {
  call(request: Request): Promise<Response>;
}

class BrowserHTTPClient implements APICall<Response> {
  call(request: Request): Promise<Response> {
    return fetch(request, { signal: AbortSignal.timeout(30000) });
  }
}

// FIXME: if we don't want to export this, export an interface for it
export class RoamBackendClient {
  static #baseUrl = "https://proxy.api.roamresearch.com";
  #token: string;
  // If the proxy miscalculates, the peer will 308-redirect; fetch follows it automatically
  // and we store the peer URL here so subsequent requests on this client instance skip the redirect.
  #peer: string | null = null;
  #httpClient: APICall<Response>;
  readonly graph: string;
  constructor(token: string, graph: string, httpClient: APICall<Response>) {
    this.#token = token;
    this.graph = graph;
    this.#httpClient = httpClient;
  }

  async api(path: string, method: string, body: object): Promise<Response> {
    const req = this.makeRequest(path, method, body);
    const response = await this.#httpClient.call(req);
    // Safety net: if the CloudFront proxy (proxy.api.roamresearch.com) miscalculates the peer,
    // the target peer will 308-redirect to the correct one. fetch follows it automatically;
    // we capture the peer URL here so subsequent requests on this client instance skip the redirect.
    if (response.redirected) {
      const re = /(https:\/\/peer-\d+.*?:\d+)\/.*/;
      const regexpResult = response.url.match(re);
      if (regexpResult?.length == 2) {
        this.#peer = regexpResult[1];
      }
    }

    switch (response.status) {
      case 200:
        break;
      case 500:
      case 400: {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const body = await response.json();
          errorMessage = body.message || errorMessage;
        } catch {
          /* non-JSON response */
        }
        throw new Error(errorMessage);
      }
      case 429:
        throw new Error("Too many requests, try again in a minute.");
      case 401:
        throw new Error("Invalid token or token doesn't have enough privileges.");
      case 503:
        throw new Error("HTTP Status: 503. Your graph is not ready yet for a request, please retry in a few seconds.");
      default:
        throw new Error(response.statusText || `HTTP ${response.status} error`);
    }
    return response;
  }

  private makeRequest(path: string, method = "POST", body: object): Request {
    const baseUrl = this.#peer ?? RoamBackendClient.#baseUrl;
    return new Request(baseUrl + path, {
      method: method,
      mode: "cors",
      cache: "no-cache",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${this.#token}`,
        "x-authorization": `Bearer ${this.#token}`,
      },
    });
  }
}

export async function q(app: RoamBackendClient, query: string, args?: any[]): Promise<any> {
  const path = `/api/graph/${app.graph}/q`;
  let body;
  if (args) {
    body = {
      query: query,
      args: args,
    };
  } else {
    body = { query: query };
  }
  const resp = await app.api(path, "POST", body);
  const { result } = await resp.json();
  return result;
}

export async function pull(app: RoamBackendClient, pattern: string, eid: string): Promise<any> {
  const path = `/api/graph/${app.graph}/pull`;
  const body = {
    eid: eid,
    selector: pattern,
  };
  const resp = await app.api(path, "POST", body);
  const { result } = await resp.json();
  return result;
}

export async function search(
  app: RoamBackendClient,
  searchStr: string,
  hideCodeBlocks = true,
  limit = 100
): Promise<any> {
  const path = `/api/graph/${app.graph}/search`;
  const body = {
    "search-str": searchStr,
    "hide-code-blocks": hideCodeBlocks,
    limit: limit,
  };
  const resp = await app.api(path, "POST", body);
  const { result } = await resp.json();
  return result;
}

// Instead of the general `number`, can we somehow specify negative integer here?
type TempUidNegInt = number;

type RoamBlockLocationGivenUid = {
  "parent-uid": string | TempUidNegInt;
  order: number | string;
};

type RoamBlockPageTitleLocation = string | { "daily-note-page": string };

type RoamBlockLocationGivenTitle = {
  "page-title": string | RoamBlockPageTitleLocation;
  order: number | string;
};

type RoamBlockLocation = RoamBlockLocationGivenUid | RoamBlockLocationGivenTitle;

type RoamBlock = {
  string: string;
  uid?: string | TempUidNegInt;
  open?: boolean;
  heading?: number;
  "text-align"?: boolean;
  "children-view-type"?: string;
};

export type RoamCreateBlock = {
  action?: "create-block";
  location: RoamBlockLocation;
  block: RoamBlock;
};

export async function createBlock(app: RoamBackendClient, body: RoamCreateBlock): Promise<boolean> {
  body.action = "create-block";
  const path = `/api/graph/${app.graph}/write`;
  const response = await app.api(path, "POST", body);
  return response.ok;
}

type RoamMoveBlock = {
  action?: "move-block";
  location: RoamBlockLocation;
  block: {
    uid: RoamBlock["uid"];
  };
};

export async function moveBlock(app: RoamBackendClient, body: RoamMoveBlock): Promise<boolean> {
  body.action = "move-block";
  const path = `/api/graph/${app.graph}/write`;
  const response = await app.api(path, "POST", body);
  return response.ok;
}

type RoamUpdateBlock = {
  action?: "update-block";
  block: {
    string?: string;
    uid: string;
    open?: boolean;
    heading?: number;
    "text-align"?: boolean;
    "children-view-type"?: string;
  };
};

export async function updateBlock(app: RoamBackendClient, body: RoamUpdateBlock): Promise<boolean> {
  body.action = "update-block";
  const path = `/api/graph/${app.graph}/write`;
  const response = await app.api(path, "POST", body);
  return response.ok;
}

type RoamDeleteBlock = {
  action?: "delete-block";
  block: {
    uid: string;
  };
};

export async function deleteBlock(app: RoamBackendClient, body: RoamDeleteBlock): Promise<boolean> {
  body.action = "delete-block";
  const path = `/api/graph/${app.graph}/write`;
  const response = await app.api(path, "POST", body);
  return response.ok;
}

type RoamCreatePage = {
  action?: "create-page";
  page: {
    title: string;
    uid?: string;
    "children-view-type"?: string;
  };
};

export async function createPage(app: RoamBackendClient, body: RoamCreatePage): Promise<boolean> {
  body.action = "create-page";
  const path = `/api/graph/${app.graph}/write`;
  const response = await app.api(path, "POST", body);
  return response.ok;
}

type RoamUpdatePage = {
  action?: "update-page";
  page: {
    title?: string;
    uid: string;
    "children-view-type"?: string;
  };
};

export async function updatePage(app: RoamBackendClient, body: RoamUpdatePage): Promise<boolean> {
  body.action = "update-page";
  const path = `/api/graph/${app.graph}/write`;
  const response = await app.api(path, "POST", body);
  return response.ok;
}

type RoamDeletePage = {
  action?: "delete-page";
  page: {
    uid: string;
  };
};

export async function deletePage(app: RoamBackendClient, body: RoamDeletePage): Promise<boolean> {
  body.action = "delete-page";
  const path = `/api/graph/${app.graph}/write`;
  const response = await app.api(path, "POST", body);
  return response.ok;
}

export type RoamSingleAction =
  | RoamDeletePage
  | RoamUpdatePage
  | RoamCreatePage
  | RoamDeleteBlock
  | RoamUpdateBlock
  | RoamMoveBlock
  | RoamCreateBlock;

type RoamBatchActions = {
  action?: "batch-actions";
  actions: RoamSingleAction[];
};

export async function batchActions(app: RoamBackendClient, body: RoamBatchActions): Promise<any> {
  body.action = "batch-actions";
  const path = `/api/graph/${app.graph}/write`;
  const response = await app.api(path, "POST", body);
  return await response.json();
}

type InitGraph = {
  graph: string;
  token: string;
  httpClient?: APICall<Response>;
};

export function initializeGraph(config: InitGraph) {
  if (config.httpClient == null) {
    config.httpClient = new BrowserHTTPClient();
  }
  return new RoamBackendClient(config.token, config.graph, config.httpClient);
}

// UTILS below

function isValidDate(date?: Date) {
  return date && Object.prototype.toString.call(date) === "[object Date]" && !isNaN(date.getTime());
}

const monthStrMap = {
  0: "January",
  1: "February",
  2: "March",
  3: "April",
  4: "May",
  5: "June",
  6: "July",
  7: "August",
  8: "September",
  9: "October",
  10: "November",
  11: "December",
};

function intOrdinalIndicator(x: number) {
  const x100 = x % 100;
  const x10 = x % 10;
  if (x100 === 11) {
    return "th";
  } else if (x100 === 12) {
    return "th";
  } else if (x100 === 13) {
    return "th";
  } else if (x10 === 1) {
    return "st";
  } else if (x10 === 2) {
    return "nd";
  } else if (x10 === 3) {
    return "rd";
  } else {
    return "th";
  }
}

// TODO: confirm that this is equivalent to `relemma.routes.app.logic.time/date->full-string`
export function dateToPageTitle(date: Date) {
  if (!isValidDate(date)) {
    return null;
  }
  const day = date.getDate();
  return `${monthStrMap[date.getMonth() as keyof typeof monthStrMap]} ${day}${intOrdinalIndicator(
    day
  )}, ${date.getFullYear()}`;
}
