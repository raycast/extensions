import { OAuth, Cache } from "@raycast/api";
import { OAuthService, getAccessToken } from "@raycast/utils";
import { Logger } from "@chrismessina/raycast-logger";
import type { Period } from "./utils/energyCalc";

// --- Configuration ---

const API_BASE = "https://fleet-api.prd.na.vn.cloud.tesla.com";

// --- Cache ---

const cache = new Cache({ namespace: "tesla-energy" });

const TTL_MS = {
  energySites: 24 * 60 * 60 * 1000,
  siteInfo: 24 * 60 * 60 * 1000,
  historyDay: 5 * 60 * 1000,
  historyWeekMonth: 15 * 60 * 1000,
  historyYear: 60 * 60 * 1000,
  aiInsight: 60 * 60 * 1000,
} as const;

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

function getCached<T>(key: string, ttlMs: number): T | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;
  try {
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.cachedAt > ttlMs) {
      cache.remove(key);
      return undefined;
    }
    return entry.data;
  } catch {
    return undefined;
  }
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, JSON.stringify({ data, cachedAt: Date.now() }));
}

function toCalendarDate(isoString: string): string {
  return isoString.slice(0, 10);
}

function historyTtl(period: Period): number {
  if (period === "day") return TTL_MS.historyDay;
  if (period === "year") return TTL_MS.historyYear;
  return TTL_MS.historyWeekMonth;
}

export function getCachedAiInsight(date: string): string | undefined {
  return getCached<string>(`ai_insight:${date}`, TTL_MS.aiInsight);
}

export function setCachedAiInsight(date: string, insight: string): void {
  setCached(`ai_insight:${date}`, insight);
}

// --- Logger ---

const log = new Logger({
  prefix: "[Tesla]",
  showTimestamp: true,
  enableRedaction: true,
});

// --- OAuth via Raycast PKCE Proxy ---

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Tesla",
  providerIcon: "extension-icon.png",
  providerId: "tesla",
  description: "Connect your Tesla account to view solar and Powerwall data",
});

export const provider = new OAuthService({
  client,
  clientId: "9208d53e-8e05-4696-addb-fff21987364a",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/iJYj_0c8sxOGHvexNi0qXCRaBHscvub2yLI7kZMyK4Ky2u5iV3xTuVTNE3LW-0ex07VjFpdLEVEoLB1yD2XlGoVYz8ph_4UjUroi4j4MNVYmvTQeIOZC5HZqR-FFWYliFhI",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/p7q14_mMGdFpROFDg19bzNg2blC7PT5i4a6ngcQP9vOfa6PV5udRzR_zvXopGW1U1u9IVw-BweEiW1oOV7L9yOd8buGsNoPdJMf4wyhZ2A6fStxe1I66z_FOpZwt4Q",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/xG23f3tmUA9zNOewrzh164GX_4cZ1FzUAmVD1kt9YLigM2OcdKeMPh78YwDZKuXNPM3ipD-BDuQXC_6mo7qPe7MPpX4u701JXxhPoAjx9yjLxf-_3IStAzrpwVHSzA",
  scope: "openid offline_access energy_device_data",
  extraParameters: { audience: API_BASE },
});

// --- Helper ---

let tokenLogged = false;

function decodeJwtClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1];
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return { error: "failed to decode JWT" };
  }
}

export function getToken(): string {
  const { token } = getAccessToken();
  if (!tokenLogged) {
    tokenLogged = true;
    const claims = decodeJwtClaims(token);
    log.debug("Access token retrieved", {
      tokenLength: token.length,
      aud: claims["aud"],
      iss: claims["iss"],
      scope: claims["scp"] ?? claims["scope"],
      exp: claims["exp"] ? new Date((claims["exp"] as number) * 1000).toISOString() : undefined,
    });
  }
  return token;
}

// --- API Types ---

export interface EnergySite {
  energy_site_id: number;
  resource_type: string;
  site_name: string;
  id: string;
}

export interface LiveStatus {
  solar_power: number;
  battery_power: number;
  grid_power: number;
  load_power: number;
  percentage_charged: number;
  total_pack_energy: number;
  energy_left: number;
  storm_mode_active: boolean;
  backup_capable: boolean;
  grid_status: string;
  island_status: string;
  timestamp: string;
}

export interface EnergyHistoryEntry {
  timestamp: string;
  solar_energy_exported: number;
  grid_energy_imported: number;
  grid_energy_exported_from_solar: number;
  grid_energy_exported_from_battery: number;
  battery_energy_exported: number;
  battery_energy_imported_from_grid: number;
  battery_energy_imported_from_solar: number;
  consumer_energy_imported_from_grid: number;
  consumer_energy_imported_from_solar: number;
  consumer_energy_imported_from_battery: number;
}

export interface SiteInfo {
  site_name: string;
  time_zone_offset: number;
  installation_time_zone: string;
  components: {
    solar: boolean;
    solar_type: string;
    battery: boolean;
    battery_count?: number;
    grid: boolean;
    load_meter: boolean;
    wall_connectors: unknown[];
  };
  backup_reserve_percent: number;
  default_real_mode: string;
}

export interface SelfConsumption {
  /** Percentage of home consumption powered by solar (0–100) */
  solar: number;
  /** Percentage of home consumption powered by Powerwall battery (0–100) */
  battery: number;
}

// --- API Functions ---

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

async function apiFetch<T>(path: string, token: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const pathWithoutQuery = path.split("?")[0];
  const done = log.time(`GET ${pathWithoutQuery}`);

  log.debug("API request", { method: "GET", url });

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const text = await response.text();
    log.error("API request failed", { status: response.status, path, response: text });
    done({ status: response.status });
    throw new Error(`Tesla API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { response: T };
  log.debug("API response", { status: response.status, path });
  done({ status: response.status });
  return data.response;
}

export async function fetchEnergySites(token: string): Promise<EnergySite[]> {
  const cacheKey = "energy_sites";
  const cached = getCached<EnergySite[]>(cacheKey, TTL_MS.energySites);
  if (cached !== undefined) {
    log.debug("Cache hit: energy sites");
    return cached;
  }

  log.step(1, "Fetching energy sites");
  const products = await apiFetch<unknown[]>("/api/1/products", token);
  const sites = products.filter((p): p is EnergySite => typeof p === "object" && p !== null && "energy_site_id" in p);
  log.info("Found energy sites", {
    count: sites.length,
    sites: sites.map((s) => ({ id: s.energy_site_id, name: s.site_name })),
  });
  setCached(cacheKey, sites);
  log.debug("Cache write: energy sites");
  return sites;
}

export async function fetchLiveStatus(token: string, siteId: number): Promise<LiveStatus> {
  log.step(2, "Fetching live status", { siteId });
  const status = await apiFetch<LiveStatus>(`/api/1/energy_sites/${siteId}/live_status`, token);
  log.info("Live status", {
    solar: `${status.solar_power}W`,
    battery: `${status.percentage_charged}%`,
    grid: `${status.grid_power}W`,
    load: `${status.load_power}W`,
  });
  return status;
}

export async function fetchSiteInfo(token: string, siteId: number): Promise<SiteInfo> {
  const cacheKey = `site_info:${siteId}`;
  const cached = getCached<SiteInfo>(cacheKey, TTL_MS.siteInfo);
  if (cached !== undefined) {
    log.debug("Cache hit: site info", { siteId });
    return cached;
  }

  log.step(2, "Fetching site info", { siteId });
  const result = await apiFetch<SiteInfo>(`/api/1/energy_sites/${siteId}/site_info`, token);
  setCached(cacheKey, result);
  log.debug("Cache write: site info", { siteId });
  return result;
}

export async function fetchSelfConsumption(
  token: string,
  siteId: number,
  period: Period,
  startDate: string,
  endDate: string,
): Promise<SelfConsumption | null> {
  const cacheKey = `self_consumption:${siteId}:${period}:${toCalendarDate(startDate)}`;
  const ttl = historyTtl(period);
  const cached = getCached<SelfConsumption | null>(cacheKey, ttl);
  if (cached !== undefined) {
    log.debug("Cache hit: self consumption", { siteId, period });
    return cached;
  }

  const params = new URLSearchParams({
    kind: "self_consumption",
    period,
    start_date: startDate,
    end_date: endDate,
    time_zone: LOCAL_TZ,
  });
  const data = await apiFetch<{ time_series: SelfConsumption[] }>(
    `/api/1/energy_sites/${siteId}/calendar_history?${params}`,
    token,
  );
  const result = data.time_series?.[0] ?? null;
  setCached(cacheKey, result);
  log.debug("Cache write: self consumption", { siteId, period });
  return result;
}

export async function fetchEnergyHistory(
  token: string,
  siteId: number,
  period: Period,
  startDate: string,
  endDate: string,
): Promise<EnergyHistoryEntry[]> {
  const cacheKey = `energy_history:${siteId}:${period}:${toCalendarDate(startDate)}`;
  const ttl = historyTtl(period);
  const cached = getCached<EnergyHistoryEntry[]>(cacheKey, ttl);
  if (cached !== undefined) {
    log.debug("Cache hit: energy history", { siteId, period, entries: cached.length });
    return cached;
  }

  log.step(1, "Fetching energy history", { siteId, period, startDate, endDate });
  // Tesla's period param controls both bucket size AND date scope — it must match
  // the display period exactly. Each value returns data for the current calendar
  // period at the appropriate granularity (day=sub-hourly, week=daily, month=daily, year=monthly).
  const params = new URLSearchParams({
    kind: "energy",
    period,
    start_date: startDate,
    end_date: endDate,
    time_zone: LOCAL_TZ,
  });
  const data = await apiFetch<{ time_series: EnergyHistoryEntry[] }>(
    `/api/1/energy_sites/${siteId}/calendar_history?${params}`,
    token,
  );
  const timeSeries = data.time_series ?? [];
  log.info("Energy history loaded", { entries: timeSeries.length, period });
  setCached(cacheKey, timeSeries);
  log.debug("Cache write: energy history", { siteId, period, entries: timeSeries.length });
  return timeSeries;
}
