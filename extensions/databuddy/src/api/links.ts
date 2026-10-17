import { countryName } from "../lib/utils";
import { findParam, post, query } from "./client";
import type {
  DatePreset,
  Link,
  LinkBrowserEntry,
  LinkClicksByDay,
  LinkClickSummary,
  LinkCountryEntry,
  LinkCreateInput,
  LinkDeviceEntry,
  LinkReferrerEntry,
  LinkUpdateInput,
} from "../types";

// CRUD

export async function fetchLinks(): Promise<Link[]> {
  return post<Link[]>("/links/list", {});
}

export async function fetchLink(id: string): Promise<Link> {
  if (!id) throw new Error("Link ID is required");
  return post<Link>("/links/get", { id });
}

export async function createLink(data: LinkCreateInput): Promise<Link> {
  return post<Link>("/links/create", data as unknown as Record<string, unknown>);
}

export async function updateLink(id: string, data: LinkUpdateInput): Promise<Link> {
  return post<Link>("/links/update", { id, ...data });
}

export async function deleteLink(id: string): Promise<void> {
  if (!id) throw new Error("Link ID is required");
  await post<{ success: true }>("/links/delete", { id });
}

// Analytics

export async function fetchLinkClicks(linkId: string, preset: DatePreset): Promise<LinkClickSummary> {
  const results = await query(linkId, ["link_total_clicks"], preset, undefined, undefined, "link_id");
  const row = findParam(results, "link_total_clicks")?.data?.[0];
  return { total_clicks: (row?.total as number) ?? 0 };
}

export async function fetchLinkClicksByDay(linkId: string, preset: DatePreset): Promise<LinkClicksByDay[]> {
  const results = await query(linkId, ["link_clicks_by_day"], preset, undefined, undefined, "link_id");
  return (findParam(results, "link_clicks_by_day")?.data ?? []).map((r) => ({
    date: (r.date as string) ?? "",
    clicks: (r.clicks as number) ?? 0,
  }));
}

export async function fetchLinkReferrers(linkId: string, preset: DatePreset): Promise<LinkReferrerEntry[]> {
  const results = await query(linkId, ["link_top_referrers"], preset, 10, undefined, "link_id");
  return (findParam(results, "link_top_referrers")?.data ?? []).map((r) => ({
    name: (r.name as string) ?? "",
    domain: (r.domain as string) ?? "",
    clicks: (r.clicks as number) ?? 0,
  }));
}

export async function fetchLinkCountries(linkId: string, preset: DatePreset): Promise<LinkCountryEntry[]> {
  const results = await query(linkId, ["link_top_countries"], preset, 10, undefined, "link_id");
  return (findParam(results, "link_top_countries")?.data ?? []).map((r) => {
    const code = (r.country_code as string) ?? "";
    return {
      name: countryName(code, (r.country_name as string) ?? (r.name as string) ?? ""),
      country_code: code,
      clicks: (r.clicks as number) ?? 0,
    };
  });
}

export async function fetchLinkDevices(linkId: string, preset: DatePreset): Promise<LinkDeviceEntry[]> {
  const results = await query(linkId, ["link_top_devices"], preset, 10, undefined, "link_id");
  return (findParam(results, "link_top_devices")?.data ?? []).map((r) => ({
    name: (r.name as string) ?? "",
    clicks: (r.clicks as number) ?? 0,
  }));
}

export async function fetchLinkBrowsers(linkId: string, preset: DatePreset): Promise<LinkBrowserEntry[]> {
  const results = await query(linkId, ["link_top_browsers"], preset, 10, undefined, "link_id");
  return (findParam(results, "link_top_browsers")?.data ?? []).map((r) => ({
    name: (r.name as string) ?? "",
    clicks: (r.clicks as number) ?? 0,
  }));
}
