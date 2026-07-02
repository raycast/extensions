import { countryName } from "../lib/utils";
import { findParam, get, post, query } from "./client";
import type {
  CountryEntry,
  DatePreset,
  PageEntry,
  QueryFilter,
  ReferrerEntry,
  Summary,
  TimeSeriesPoint,
  Website,
} from "../types";

// CRUD

export async function fetchWebsites(): Promise<Website[]> {
  const json = await get<{ success: boolean; websites: Website[] }>("/query/websites");
  if (!json.success) throw new Error("Failed to fetch websites.");
  return json.websites;
}

export async function fetchWebsite(id: string): Promise<Website> {
  if (!id) throw new Error("Website ID is required");
  return post<Website>("/websites/getById", { id });
}

export async function createWebsite(name: string, domain: string): Promise<Website> {
  return post<Website>("/websites/create", { name, domain });
}

export async function updateWebsite(id: string, name: string, domain?: string): Promise<Website> {
  return post<Website>("/websites/update", { id, name, ...(domain ? { domain } : {}) });
}

export async function togglePublic(id: string, isPublic: boolean): Promise<void> {
  await post("/websites/togglePublic", { id, isPublic });
}

export async function deleteWebsite(id: string): Promise<void> {
  if (!id) throw new Error("Website ID is required");
  await post<{ success: true }>("/websites/delete", { id });
}

// Analytics

export async function fetchSummary(websiteId: string, preset: DatePreset): Promise<Summary> {
  const results = await query(websiteId, ["summary_metrics"], preset);
  const row = findParam(results, "summary_metrics")?.data?.[0];

  return {
    pageviews: (row?.pageviews as number) ?? 0,
    unique_visitors: (row?.unique_visitors as number) ?? 0,
    sessions: (row?.sessions as number) ?? 0,
    bounce_rate: (row?.bounce_rate as number) ?? 0,
    median_session_duration: (row?.median_session_duration as number) ?? 0,
  };
}

export async function fetchTopPages(websiteId: string, preset: DatePreset): Promise<PageEntry[]> {
  const results = await query(websiteId, ["top_pages"], preset, 10);
  return (findParam(results, "top_pages")?.data ?? []).map((r) => ({
    name: (r.name as string) ?? "",
    pageviews: (r.pageviews as number) ?? 0,
    visitors: (r.visitors as number) ?? 0,
    percentage: (r.percentage as number) ?? 0,
  }));
}

export async function fetchReferrers(websiteId: string, preset: DatePreset): Promise<ReferrerEntry[]> {
  const results = await query(websiteId, ["top_referrers"], preset, 10);
  return (findParam(results, "top_referrers")?.data ?? []).map((r) => ({
    name: (r.name as string) ?? "",
    domain: (r.domain as string) ?? "",
    pageviews: (r.pageviews as number) ?? 0,
    visitors: (r.visitors as number) ?? 0,
    percentage: (r.percentage as number) ?? 0,
  }));
}

export async function fetchTimeSeries(
  websiteId: string,
  preset: DatePreset,
  filters?: QueryFilter[],
): Promise<TimeSeriesPoint[]> {
  const results = await query(websiteId, ["events_by_date"], preset, undefined, filters);
  return (findParam(results, "events_by_date")?.data ?? []).map((r) => ({
    date: (r.date as string) ?? "",
    pageviews: (r.pageviews as number) ?? 0,
    visitors: (r.visitors as number) ?? 0,
    sessions: (r.sessions as number) ?? 0,
  }));
}

export async function fetchCountries(websiteId: string, preset: DatePreset): Promise<CountryEntry[]> {
  const results = await query(websiteId, ["country"], preset, 10);
  return (findParam(results, "country")?.data ?? []).map((r) => {
    const code = (r.country_code as string) ?? "";
    return {
      name: countryName(code, (r.name as string) ?? ""),
      country_code: code,
      visitors: (r.visitors as number) ?? 0,
      percentage: (r.percentage as number) ?? 0,
    };
  });
}
