import { buildPaperlibQuery } from "./query";
import { normalizePapers } from "./normalize";
import { DEFAULT_API_HOST, type PaperEntity } from "./types";

export interface HttpClient {
  fetch(
    url: string,
    init?: { method?: string; signal?: AbortSignal },
  ): Promise<{
    ok: boolean;
    status: number;
    text(): Promise<string>;
  }>;
}

export class PaperlibApiClient {
  constructor(
    private readonly host: string,
    private readonly http: HttpClient,
    private readonly timeoutMs = 2500,
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.request("/");
      const body = await response.text();
      return response.ok && /paperlib/i.test(body);
    } catch {
      return false;
    }
  }

  async searchPapers(search: string, limit?: number): Promise<PaperEntity[]> {
    const query = buildPaperlibQuery(search, limit);
    let raw: unknown;
    try {
      raw = await this.rpc("PLAPI", "paperService", "load", [query, "addTime", "desc"]);
    } catch (error) {
      if (!limit || !/invalid filter/i.test(String(error))) {
        throw error;
      }
      raw = await this.rpc("PLAPI", "paperService", "load", [buildPaperlibQuery(search), "addTime", "desc"]);
    }
    return normalizePapers(raw);
  }

  async exportBibTeX(papers: PaperEntity[]): Promise<string | null> {
    try {
      const raw = await this.rpc("PLAPI", "referenceService", "exportBibTexBody", [papers]);
      return typeof raw === "string" && raw.trim() ? raw : null;
    } catch {
      return null;
    }
  }

  async exportCitation(papers: PaperEntity[]): Promise<string | null> {
    try {
      const raw = await this.rpc("PLAPI", "referenceService", "exportPlainText", [papers]);
      return typeof raw === "string" && raw.trim() ? raw : null;
    } catch {
      return null;
    }
  }

  async getPreference(key: string): Promise<string | null> {
    try {
      const raw = await this.rpc("PLAPI", "preferenceService", "get", [key]);
      return raw == null ? null : String(raw);
    } catch {
      return null;
    }
  }

  private async rpc(group: string, service: string, method: string, args: unknown[]): Promise<unknown> {
    const encodedArgs = encodeURIComponent(JSON.stringify(args));
    const path = `/${group}.${service}.${method}/?args=${encodedArgs}`;
    const response = await this.request(path);
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`${group}.${service}.${method} failed (${response.status}): ${text.slice(0, 180)}`);
    }

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private async request(path: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.http.fetch(joinUrl(this.host, path), { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createApiClient(host = DEFAULT_API_HOST, http: HttpClient = globalHttp()): PaperlibApiClient {
  return new PaperlibApiClient(host.replace(/\/$/, ""), http);
}

function globalHttp(): HttpClient {
  return {
    async fetch(url, init) {
      const response = await fetch(url, init);
      return {
        ok: response.ok,
        status: response.status,
        text: () => response.text(),
      };
    },
  };
}

function joinUrl(host: string, path: string): string {
  if (path.startsWith("/")) {
    return `${host}${path}`;
  }
  return `${host}/${path}`;
}
