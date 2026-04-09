import { getPreferenceValues } from "@raycast/api";
import {
  ApiResponse,
  OverviewData,
  RealtimeData,
  RealtimeMapData,
  PageData,
  ReferrerData,
  CampaignData,
  CountryData,
  RegionData,
  CityData,
  MetadataData,
  DateRangeParams,
} from "./types";

const BASE_URL = "https://datafa.st/api/v1";

function getTimezone(): string {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export async function datafastFetch<T>(
  endpoint: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const prefs = getPreferenceValues<Preferences>();
  const url = new URL(`${BASE_URL}${endpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  if (!url.searchParams.has("timezone")) {
    url.searchParams.set("timezone", getTimezone());
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${prefs.apiKey}`,
      Accept: "application/json",
    },
  });

  const json = (await response.json()) as ApiResponse<T>;

  if (json.status === "error") {
    throw new Error(json.error.message || `API error: ${json.error.code}`);
  }

  return json.data;
}

async function datafastFetchOne<T>(
  endpoint: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const data = await datafastFetch<T | T[]>(endpoint, params);
  if (Array.isArray(data)) {
    return data[0] as T;
  }
  return data as T;
}

export function fetchOverview(params: DateRangeParams) {
  return datafastFetchOne<OverviewData>("/analytics/overview", params);
}

export function fetchRealtime() {
  return datafastFetchOne<RealtimeData>("/analytics/realtime");
}

export function fetchRealtimeMap() {
  return datafastFetchOne<RealtimeMapData>("/analytics/realtime/map");
}

export function fetchPages(params: DateRangeParams & { limit?: number }) {
  return datafastFetch<PageData[]>("/analytics/pages", params);
}

export function fetchReferrers(params: DateRangeParams & { limit?: number }) {
  return datafastFetch<ReferrerData[]>("/analytics/referrers", params);
}

export function fetchCampaigns(params: DateRangeParams & { limit?: number }) {
  return datafastFetch<CampaignData[]>("/analytics/campaigns", params);
}

export function fetchCountries(params: DateRangeParams & { limit?: number }) {
  return datafastFetch<CountryData[]>("/analytics/countries", params);
}

export function fetchRegions(
  params: DateRangeParams & { country?: string; limit?: number },
) {
  return datafastFetch<RegionData[]>("/analytics/regions", params);
}

export function fetchCities(
  params: DateRangeParams & { country?: string; limit?: number },
) {
  return datafastFetch<CityData[]>("/analytics/cities", params);
}

export function fetchMetadata() {
  return datafastFetchOne<MetadataData>("/analytics/metadata");
}
