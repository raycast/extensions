import { StatsResponse, TimeRange } from "./types";
import { getDateRange } from "./format";

const BASE_URL = "https://simpleanalytics.com";
const API_VERSION = 6;
const DEFAULT_FIELDS = ["pageviews", "visitors", "seconds_on_page", "pages", "referrers"];

interface FetchStatsOptions {
  domain: string;
  apiKey?: string;
  timeRange: TimeRange;
  fields?: string[];
  limit?: number;
}

export async function fetchStats(options: FetchStatsOptions): Promise<StatsResponse> {
  const { domain, apiKey, timeRange, fields = DEFAULT_FIELDS, limit = 5 } = options;
  const { start, end } = getDateRange(timeRange);

  const params = new URLSearchParams({
    version: API_VERSION.toString(),
    fields: fields.join(","),
    start,
    end,
    limit: limit.toString(),
  });

  const url = `${BASE_URL}/${domain}.json?${params.toString()}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Api-Key"] = apiKey;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid API key or unauthorized access");
    }
    if (response.status === 404) {
      throw new Error("Website not found. Check the domain name.");
    }
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as StatsResponse;
}

export async function testConnection(domain: string, apiKey?: string): Promise<{ success: boolean; error?: string }> {
  try {
    await fetchStats({
      domain,
      apiKey,
      timeRange: "today",
      fields: ["pageviews"],
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function getDashboardUrl(domain: string): string {
  return `${BASE_URL}/${domain}`;
}
