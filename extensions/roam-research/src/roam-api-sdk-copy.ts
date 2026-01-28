// MAYBE replace this with the actual sdk at some point
// one reason I want to do it this way is because I want to be able to cache the peer for the graph somewhere

// Changes made from the code in https://github.com/Roam-Research/backend-sdks/blob/0933181963e8c2eb7403bdbbe9a7885e0ea2abc7/typescript/src/index.ts:
//   0. Changed #peer declaration from just `string` to `string | undefined` because TS compiler was alerting as error/warning
//   1. importing fetch and Request from "cross-fetch" node module
//   2. Changed `q`'s `args` param's type from `string[]` to `any[]`
//   3. Other multiple changes have been made, will want to take a code diff later and move stuff to roam-api-sdk we want for everyone

import { fetch, Request } from "cross-fetch";

interface APICall<Response> {
  call(request: Request): Promise<Response>;
}

class BrowserHTTPClient implements APICall<Response> {
  call(request: Request): Promise<Response> {
    return fetch(request);
  }
}

export type peerUrlUpdatedCallbackFn = (graphName: string, newPeerUrl: string) => void;

// FIXME: if we don't want to export this, export an interface for it
export class RoamBackendClient {
  //static #baseUrl = 'https://peer-2.api.roamresearch.com:3004';
  static #baseUrl = "https://api.roamresearch.com";
  //static #baseUrl = "http://localhost:3000";
  #token: string;
  #peer: string | undefined;
  #peerUrlUpdatedCallback: peerUrlUpdatedCallbackFn | undefined;
  #httpClient: APICall<Response>;
  readonly graph: string;
  constructor(
    token: string,
    graph: string,
    httpClient: APICall<Response>,
    peerUrl?: string,
    peerUrlUpdatedCallback?: peerUrlUpdatedCallbackFn
  ) {
    this.#token = token;
    this.graph = graph;
    this.#httpClient = httpClient;
    if (peerUrl) {
      this.#peer = peerUrl;
    }
    if (peerUrlUpdatedCallback && typeof peerUrlUpdatedCallback === "function") {
      this.#peerUrlUpdatedCallback = peerUrlUpdatedCallback;
    }
  }

  async api(path: string, method: string, body: object): Promise<Response> {
    const req = this.makeRequest(path, method, body);
    const response = await this.#httpClient.call(req);
    if (response.redirected) {
      const re = /(https:\/\/peer-\d+.*?:\d+)\/.*/;
      const regexpResult = response.url.match(re);
      if (regexpResult?.length == 2) {
        this.#peer = regexpResult[1];
        if (this.#peerUrlUpdatedCallback) {
          this.#peerUrlUpdatedCallback(this.graph, regexpResult[1]);
        }
      }
    }

    switch (response.status) {
      case 200:
        break;
      case 500:
      case 400:
        throw new Error("Error: " + (await response.json()).message ?? "HTTP " + response.status);
      case 429:
        throw new Error("Too many requests, try again in a minute.");
      case 401:
        throw new Error("Invalid token or token doesn't have enough privileges.");
      case 503:
        throw new Error("HTTP Status: 503. Your graph is not ready yet for a request, please retry in a few seconds.");
      default:
        throw new Error(response.statusText);
    }
    return response;
  }

  private makeRequest(path: string, method = "POST", body: object): Request {
    const baseUrl = this.#peer ?? RoamBackendClient.#baseUrl;
    // console.log("makeRequest: body: ", JSON.stringify(body));
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
  peerUrl?: string;
  peerUrlUpdatedCallback?: peerUrlUpdatedCallbackFn;
};

export function initializeGraph(config: InitGraph) {
  if (config.httpClient == null) {
    config.httpClient = new BrowserHTTPClient();
  }
  return new RoamBackendClient(
    config.token,
    config.graph,
    config.httpClient,
    config.peerUrl,
    config.peerUrlUpdatedCallback
  );
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

// console.log("today's DNP: ", dateToPageTitle(new Date()));
