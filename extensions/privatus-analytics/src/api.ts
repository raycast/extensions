// A small client for the Privatus Analytics JSON API.
// It has no Raycast imports, so the tests can run it in plain Node.

export const BASE_URL = "https://privatusanalytics.com";

export const SITE_ID_PATTERN = /^pa_[A-Za-z0-9]+$/;
const WORKSPACE_ID_PATTERN = /^ws_[A-Za-z0-9]+$/;

export type Workspace = {
  id: string;
  name: string;
  plan?: string;
};

export type Site = {
  id: string;
  workspace_id: string;
  domain: string;
  name: string;
  last_event_at: string | null;
};

export type SiteStats = {
  visitors?: number;
  change?: number | null;
  live?: number;
  sparkline?: number[];
  icon?: string;
};

export type SiteWithStats = Site & { stats: SiteStats; workspaceName: string };

export type Metrics = {
  visitors?: number;
  visits?: number;
  pageviews?: number;
  views_per_visit?: number;
  bounce_rate?: number;
  visit_duration?: number;
  revenue?: number;
};

export type PanelRow = {
  value: string;
  visitors?: number;
  visits?: number;
  pageviews?: number;
  share?: number;
};

export type Overview = {
  period?: { from: string; to: string };
  metrics: Metrics;
  change?: Partial<Record<keyof Metrics, number | null>>;
  panels?: Record<string, PanelRow[]>;
  live_visitors?: number;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

export function isValidSiteId(id: unknown): id is string {
  return typeof id === "string" && SITE_ID_PATTERN.test(id);
}

export function isValidToken(token: unknown): token is string {
  return typeof token === "string" && /^pat_[A-Za-z0-9_-]+$/.test(token.trim());
}

export function dashboardUrl(siteId?: string): string {
  if (siteId && isValidSiteId(siteId)) {
    return `${BASE_URL}/sites/${encodeURIComponent(siteId)}/overview`;
  }
  return `${BASE_URL}/app`;
}

// The tracking tag for a site. The site ID is checked first, so nothing
// odd can end up inside the HTML attribute.
export function trackingSnippet(siteId: string): string {
  if (!isValidSiteId(siteId)) {
    throw new Error(`Not a valid site ID: ${siteId}`);
  }
  return `<script defer src="https://privatusstats.com/js/pa.js" data-site="${siteId}" data-modules="engage,auto,vitals,clicks,ask"></script>`;
}

export class Client {
  private token: string;
  private fetchImpl: FetchLike;
  private baseUrl: string;

  constructor(token: string, options: { fetch?: FetchLike; baseUrl?: string } = {}) {
    this.token = token.trim();
    this.fetchImpl = options.fetch ?? (globalThis.fetch as unknown as FetchLike);
    this.baseUrl = (options.baseUrl ?? BASE_URL).replace(/\/+$/, "");
  }

  async get<T>(path: string, query: Record<string, string> | URLSearchParams = {}, signal?: AbortSignal) {
    const qs = new URLSearchParams(query).toString();
    const url = `${this.baseUrl}${path}${qs ? `?${qs}` : ""}`;
    const res = await this.fetchImpl(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.token}`,
        "User-Agent": "privatus-raycast/1.0",
      },
      signal,
    });
    const body = await res.text();
    let json: { data?: T; meta?: Record<string, unknown>; error?: { code?: string; message?: string } } = {};
    try {
      json = body ? JSON.parse(body) : {};
    } catch {
      if (res.ok) throw new ApiError(res.status, "The server sent a reply that is not JSON.");
    }
    if (!res.ok) {
      throw new ApiError(res.status, friendlyError(res.status, json.error?.message), json.error?.code);
    }
    return { data: json.data as T, meta: (json.meta ?? {}) as Record<string, unknown> };
  }

  async workspaces(signal?: AbortSignal): Promise<Workspace[]> {
    const { data } = await this.get<Workspace[]>("/workspaces.json", { per_page: "100" }, signal);
    return data ?? [];
  }

  // Every site in every workspace the token can see, with the 30-day
  // visitor count, change and live count from the list's meta.
  async sitesWithStats(signal?: AbortSignal): Promise<SiteWithStats[]> {
    const workspaces = await this.workspaces(signal);
    const out: SiteWithStats[] = [];
    for (const ws of workspaces) {
      if (!WORKSPACE_ID_PATTERN.test(ws.id)) continue;
      for (let page = 1; page <= 50; page++) {
        const { data, meta } = await this.get<Site[]>(
          `/workspaces/${encodeURIComponent(ws.id)}/sites.json`,
          { page: String(page), per_page: "100", sort: "visitors" },
          signal,
        );
        const stats = (meta.stats ?? {}) as Record<string, SiteStats>;
        for (const site of data ?? []) {
          if (!isValidSiteId(site.id)) continue;
          out.push({ ...site, stats: stats[site.id] ?? {}, workspaceName: ws.name });
        }
        const totalPages = Number(meta.total_pages ?? 1);
        if (!data || data.length === 0 || page >= totalPages) break;
      }
    }
    return out;
  }

  async overview(siteId: string, period: string, signal?: AbortSignal): Promise<Overview> {
    if (!isValidSiteId(siteId)) throw new Error(`Not a valid site ID: ${siteId}`);
    const params = new URLSearchParams({ period, compare: "previous_period", interval: "day" });
    for (const p of ["page", "referrer", "country"]) params.append("panels[]", p);
    const { data } = await this.get<Overview>(`/sites/${encodeURIComponent(siteId)}/overview.json`, params, signal);
    return data;
  }
}

export function friendlyError(status: number, message?: string): string {
  if (status === 401) return "Your API token was not accepted. Check it in the extension settings.";
  if (status === 403) return "Your API token cannot read this. It needs the analytics.read permission.";
  if (status === 404) return "Not found. The site may have been removed.";
  if (status === 429) return "Too many requests. Wait a minute and try again.";
  if (status >= 500) return "Privatus Analytics is having trouble right now. Try again soon.";
  return message || `Request failed (${status}).`;
}
