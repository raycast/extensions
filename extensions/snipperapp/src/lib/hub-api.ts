import type { HubSnippet } from "./types";

export const HUB_API = "https://snipperapp.com/api/v1";
export const HUB_WEB = "https://snipperapp.com";

export type HubSort = "relevance" | "popular" | "recent" | "imports";

export interface HubListResponse {
  data: HubSnippet[];
  total?: number;
}

export function hubSearchURL(params: { q?: string; language?: string; sort?: HubSort; limit?: number }): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.language) sp.set("language", params.language);
  sp.set("sort", params.sort ?? "relevance");
  sp.set("limit", String(params.limit ?? 30));
  return `${HUB_API}/search?${sp.toString()}`;
}

export function hubTrendingURL(limit = 30): string {
  return `${HUB_API}/trending?limit=${limit}`;
}

/** Public web page for a Hub snippet. */
export function hubWebURL(id: string): string {
  return `${HUB_WEB}/s/${id}`;
}

/** Deep link that opens SnipperApp and imports the snippet into the local library. */
export function hubImportDeepLink(id: string): string {
  return `snipper://hub/import/${id}`;
}

/** Best-effort anonymous import analytics. */
export async function trackHubImport(id: string): Promise<void> {
  try {
    await fetch(`${HUB_API}/snippets/${id}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "raycast" }),
    });
  } catch {
    // analytics are best-effort
  }
}
