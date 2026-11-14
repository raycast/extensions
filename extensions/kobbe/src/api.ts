import { getKobbePreferences } from "./preferences";
import type {
  KobbeLiveSite,
  KobbeRevenue,
  KobbeSite,
  LiveResponse,
  OverviewResponse,
  RevenueResponse,
  SetupHealthResponse,
  SitesResponse,
  SourcesResponse,
  TimeRange,
  TopPagesResponse,
} from "./types";

type ApiErrorBody = {
  ok?: false;
  error?: string;
  required?: string;
};

export class KobbeApiError extends Error {
  status: number;
  requiredScope?: string;

  constructor(message: string, status: number, requiredScope?: string) {
    super(message);
    this.name = "KobbeApiError";
    this.status = status;
    this.requiredScope = requiredScope;
  }
}

function errorMessageFromBody(body: ApiErrorBody, status: number): string {
  if (status === 401) {
    return "Kobbe rejected the API token.";
  }
  if (status === 403 && body.required) {
    return `API token is missing the ${body.required} scope.`;
  }
  if (body.error) {
    return body.error.replace(/_/g, " ");
  }
  return `Kobbe API request failed (${status}).`;
}

async function kobbeFetch<T>(path: string, searchParams?: Record<string, string | number | undefined>): Promise<T> {
  const preferences = getKobbePreferences();

  if (!preferences.apiToken) {
    throw new KobbeApiError("Add your Kobbe API token in extension preferences.", 401);
  }
  const url = new URL(path, preferences.baseUrl);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value != null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${preferences.apiToken}`,
      Accept: "application/json",
    },
  });

  const body = (await response.json().catch(() => ({}))) as T | ApiErrorBody;

  const isErrorBody = typeof body === "object" && body !== null && "ok" in body && body.ok === false;

  if (!response.ok || isErrorBody) {
    const errorBody = body as ApiErrorBody;
    throw new KobbeApiError(errorMessageFromBody(errorBody, response.status), response.status, errorBody.required);
  }

  return body as T;
}

export async function listSites(): Promise<KobbeSite[]> {
  const response = await kobbeFetch<SitesResponse>("/api/agent/sites");
  return response.sites;
}

export async function getOverview(siteId: string, range: TimeRange): Promise<OverviewResponse> {
  return kobbeFetch<OverviewResponse>(`/api/agent/sites/${encodeURIComponent(siteId)}/overview`, { range });
}

export async function getTopPages(siteId: string, range: TimeRange, limit = 25): Promise<TopPagesResponse> {
  return kobbeFetch<TopPagesResponse>(`/api/agent/sites/${encodeURIComponent(siteId)}/top-pages`, { range, limit });
}

export async function getSources(siteId: string, range: TimeRange, limit = 25): Promise<SourcesResponse> {
  return kobbeFetch<SourcesResponse>(`/api/agent/sites/${encodeURIComponent(siteId)}/sources`, { range, limit });
}

export async function getRevenue(siteId: string, range: TimeRange): Promise<RevenueResponse> {
  return kobbeFetch<RevenueResponse>(`/api/agent/sites/${encodeURIComponent(siteId)}/revenue`, { range });
}

export async function getSetupHealth(siteId: string): Promise<SetupHealthResponse> {
  return kobbeFetch<SetupHealthResponse>(`/api/agent/sites/${encodeURIComponent(siteId)}/setup-health`);
}

export async function getRevenueWithOverview(siteId: string, range: TimeRange) {
  const [revenueResponse, overviewResponse] = await Promise.all([
    getRevenue(siteId, range),
    getOverview(siteId, range),
  ]);
  return { revenueResponse, overviewResponse };
}

/** Fallback fan-out is capped so large accounts don't fire dozens of requests per refresh. */
const LIVE_FALLBACK_SITE_LIMIT = 20;

export async function getLiveVisitors(): Promise<KobbeLiveSite[]> {
  try {
    const response = await kobbeFetch<LiveResponse>("/api/agent/live");
    return response.sites;
  } catch (error) {
    // Self-hosted servers predating the batch endpoint return 404; fall back to per-site requests.
    if (!(error instanceof KobbeApiError && error.status === 404)) {
      throw error;
    }
  }
  const sites = await listSites();
  return Promise.all(
    sites.map(async (site, index) => {
      // Sites beyond the cap stay in the list with an unknown count (rendered as
      // "Could not load" plus the "+" total indicator) instead of silently vanishing.
      if (index >= LIVE_FALLBACK_SITE_LIMIT) {
        return { site, online: null };
      }
      try {
        const response = await getOverview(site.id, "today");
        return { site, online: parseCompactNumber(response.overview.kpis.online) };
      } catch {
        // Keep the site visible but flag the count as unknown instead of a fake zero.
        return { site, online: null };
      }
    }),
  );
}

/** Parses display strings like "1,234" or "1.2K"; null when the format is unrecognized. */
function parseCompactNumber(display: string): number | null {
  const match = /^([\d.,]+)\s*([KMB])?$/i.exec(display.trim());
  if (!match) {
    return null;
  }
  const base = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(base)) {
    return null;
  }
  const multiplier = { K: 1_000, M: 1_000_000, B: 1_000_000_000 }[match[2]?.toUpperCase() ?? ""] ?? 1;
  return Math.round(base * multiplier);
}

export function dashboardUrl(siteId: string, range?: TimeRange): string {
  const preferences = getKobbePreferences();
  const url = new URL(`/s/${encodeURIComponent(siteId)}`, preferences.baseUrl);
  if (range) {
    url.searchParams.set("range", range);
  }
  return url.toString();
}

export function formatRevenue(revenue: KobbeRevenue): string {
  if (revenue.orders <= 0 || revenue.amount <= 0) {
    return "No revenue";
  }
  return formatRevenueAmount(revenue.amount, revenue.currency, revenue.multipleCurrencies);
}

export function formatRevenueAmount(amount: number, currency: string | null, multipleCurrencies = false): string {
  if (multipleCurrencies || !currency) {
    return "Multiple currencies";
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount / 100);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}
