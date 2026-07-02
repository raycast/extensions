import crypto from "crypto";
import {
  MOBILE_HOST_POOL,
  USER_AGENT_MOBILE,
  getClientInfo,
  MOBILE_MAIN_PAGE_PATH,
  MOBILE_SEARCH_PATH,
  MOBILE_SEARCH_PATH_V1,
  MOBILE_RESOURCE_PATH,
  MOBILE_EXT_CAPTIONS_PATH,
  MOBILE_SUBJECT_GET_PATH,
} from "./constants";
import { generateXClientToken, generateXTrSignature } from "./crypto";
import {
  SubjectItem,
  HomepageResponse,
  StreamData,
  CaptionsResponse,
} from "./types";

export class MobileApi {
  private runtimeToken: string | null = null;
  private activeBase: string = MOBILE_HOST_POOL[0];
  private deviceId: string;
  private gaid: string;

  constructor() {
    this.deviceId = crypto.randomBytes(16).toString("hex");
    this.gaid = crypto.randomUUID();
  }

  private extractAuthToken(xUserStr: string | null) {
    if (!xUserStr) return;
    try {
      const { token } = JSON.parse(xUserStr);
      if (token) this.runtimeToken = token;
    } catch {
      // Ignored: Token might not be present or valid JSON
    }
  }

  private buildSignedHeaders(
    method: string,
    urlStr: string,
    body: string | null = null,
  ): Record<string, string> {
    const ts = Date.now();
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT_MOBILE,
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
      Connection: "keep-alive",
      "X-Client-Token": generateXClientToken(ts),
      "x-tr-signature": generateXTrSignature(
        method,
        "application/json",
        "application/json; charset=utf-8",
        urlStr,
        body,
        ts,
      ),
      "X-Client-Info": getClientInfo(this.deviceId, this.gaid),
      "X-Client-Status": "0",
    };

    if (this.runtimeToken && !urlStr.includes(MOBILE_MAIN_PAGE_PATH)) {
      headers["Authorization"] = `Bearer ${this.runtimeToken}`;
    }
    return headers;
  }

  async request(
    method: string,
    pathAndQuery: string,
    body: string | null = null,
  ): Promise<unknown> {
    let lastError: unknown;

    for (const base of MOBILE_HOST_POOL) {
      const urlStr = `${base}${pathAndQuery}`;
      const headers = this.buildSignedHeaders(method, urlStr, body);

      try {
        const init: RequestInit = { method, headers };
        if (body && method === "POST") {
          init.body = body;
        }

        const res = await fetch(urlStr, init);
        this.extractAuthToken(res.headers.get("x-user"));

        if (![403, 407, 429, 500, 502, 503, 504].includes(res.status)) {
          this.activeBase = base;
          const text = await res.text();
          let json: { code?: number; message?: string; data?: unknown };
          try {
            json = JSON.parse(text);
          } catch {
            throw new Error(`Invalid JSON response from ${base}`);
          }
          if (json.code === 0 && json.message === "ok") {
            return json.data;
          }
          throw new Error(`API Error: ${json.message || "Unknown error"}`);
        }
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error("All hosts failed");
  }

  async initAuth() {
    if (!this.runtimeToken) {
      await this.request(
        "GET",
        `${MOBILE_MAIN_PAGE_PATH}?page=1&tabId=0&version=`,
      );
    }
  }

  async getResource(
    subjectId: string,
    resolution: number = 0,
    season: number = 0,
    episode: number = 0,
  ): Promise<StreamData | null> {
    await this.initAuth();
    const data = (await this.request(
      "GET",
      `${MOBILE_RESOURCE_PATH}?subjectId=${subjectId}&resolution=${resolution}&page=1&perPage=20&se=${season}&ep=${episode}`,
    )) as StreamData | null;
    return data;
  }

  async getDetails(subjectId: string): Promise<SubjectItem | null> {
    await this.initAuth();
    const data = (await this.request(
      "GET",
      `${MOBILE_SUBJECT_GET_PATH}?subjectId=${subjectId}`,
    )) as SubjectItem | null;
    return data;
  }

  async getCaptions(
    subjectId: string,
    resourceId: string,
  ): Promise<CaptionsResponse | null> {
    await this.initAuth();
    const data = (await this.request(
      "GET",
      `${MOBILE_EXT_CAPTIONS_PATH}?subjectId=${subjectId}&resourceId=${resourceId}`,
    )) as CaptionsResponse | null;
    return data;
  }

  async getHomepage(
    page: number = 1,
    tabId: number = 0,
  ): Promise<HomepageResponse | null> {
    await this.initAuth();
    const data = (await this.request(
      "GET",
      `${MOBILE_MAIN_PAGE_PATH}?page=${page}&tabId=${tabId}&version=`,
    )) as HomepageResponse | null;
    return data;
  }

  async search(
    keyword: string,
    subjectType: number,
    tabId: number | string = 0,
    page: number = 1,
  ): Promise<SubjectItem[]> {
    await this.initAuth();

    const payload = JSON.stringify({
      keyword,
      subjectType,
      tabId,
      page,
      perPage: 20,
    });

    const [v1Response, v2Response] = await Promise.all([
      this.request("POST", MOBILE_SEARCH_PATH_V1, payload).catch(() => ({
        items: [],
      })) as Promise<{ items?: SubjectItem[]; subjects?: SubjectItem[] }>,
      this.request("POST", MOBILE_SEARCH_PATH, payload).catch(() => ({
        items: [],
      })) as Promise<{ items?: SubjectItem[]; subjects?: SubjectItem[] }>,
    ]);

    const combinedResults: SubjectItem[] = [
      ...(v1Response.items || v1Response.subjects || []),
      ...(v2Response.items || v2Response.subjects || []),
    ];

    const uniqueIds = new Set<string>();
    return combinedResults.filter((item) => {
      if (uniqueIds.has(item.subjectId)) return false;
      uniqueIds.add(item.subjectId);
      return true;
    });
  }
}
