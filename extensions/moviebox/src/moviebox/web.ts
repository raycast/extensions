import {
  WEB_API_BASE,
  USER_AGENT_WEB,
  WEB_SEARCH_PATH,
  WEB_RESOURCE_PATH,
  SubjectType,
} from "./constants";
import { SubjectItem } from "./types";

export class WebApi {
  private runtimeToken: string | null = null;

  private absorbXUser(xUserStr: string | null) {
    if (!xUserStr) return;
    try {
      const payload = JSON.parse(xUserStr);
      if (payload.token) {
        this.runtimeToken = payload.token;
      }
    } catch (e) {
      // ignore
    }
  }

  async request(
    method: string,
    pathAndQuery: string,
    body: string | null = null,
  ): Promise<unknown> {
    const urlStr = `${WEB_API_BASE}${pathAndQuery}`;
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT_WEB,
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
    };

    if (this.runtimeToken) {
      headers["Authorization"] = `Bearer ${this.runtimeToken}`;
    }

    const init: RequestInit = { method, headers };
    if (body && method === "POST") {
      init.body = body;
    }

    const res = await fetch(urlStr, init);
    this.absorbXUser(res.headers.get("x-user"));

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }

    const text = await res.text();
    let json: { code?: number; message?: string; data?: unknown };
    try {
      json = JSON.parse(text);
    } catch (err) {
      throw new Error(
        `Failed to parse JSON. Raw response: ${text.substring(0, 200)}...`,
      );
    }
    if (json.code === 0 && json.message === "ok") {
      return json.data;
    }
    throw new Error(`API Error: ${JSON.stringify(json)}`);
  }

  async initAuth() {
    if (!this.runtimeToken) {
      // Send a dummy search-suggest to get the token (v1/v2 approach)
      await this.request(
        "POST",
        `/wefeed-h5api-bff/subject/search-suggest`,
        JSON.stringify({ keyword: "a", perPage: 0 }),
      );
    }
  }

  async search(query: string, subjectType: SubjectType) {
    await this.initAuth();
    const payload = {
      keyword: query,
      page: 1,
      perPage: 20,
      subjectType: subjectType,
    };
    const data = (await this.request(
      "POST",
      WEB_SEARCH_PATH,
      JSON.stringify(payload),
    )) as { results?: { subjects?: SubjectItem[] }[] };
    return data?.results?.[0]?.subjects || [];
  }

  async getResource(
    subjectId: string,
    season: number = 0,
    episode: number = 0,
    detailPath: string = "",
  ) {
    await this.initAuth();
    let path = `${WEB_RESOURCE_PATH}?subjectId=${subjectId}&se=${season}&ep=${episode}`;
    if (detailPath) {
      path += `&detailPath=${encodeURIComponent(detailPath)}`;
    }
    const data = await this.request("GET", path);
    return data;
  }
}
