import type { CanonicalUrl, MozPlacesRow } from "../types";
import { TRACKING_PARAM_DENYLIST } from "../constants";

export function canonicalizeUrl(rawUrl: string): CanonicalUrl {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    const denylist = new Set(TRACKING_PARAM_DENYLIST);
    const params = new URLSearchParams();
    for (const [name, value] of parsed.searchParams) {
      if (!denylist.has(name.toLowerCase())) params.append(name, value);
    }
    params.sort();

    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
    const query = params.toString();
    const key = `${host}/${path}${query ? `?${query}` : ""}`;

    const displayPath = parsed.pathname === "/" ? "" : parsed.pathname;
    const url = `${parsed.protocol}//${host}${displayPath}${query ? `?${query}` : ""}`.replace(/\/+$/, "");

    return { url, key };
  } catch {
    return { url: rawUrl, key: rawUrl };
  }
}

export function dedupeByCanonical(rows: readonly MozPlacesRow[]): MozPlacesRow[] {
  const best = new Map<string, MozPlacesRow>();

  for (const row of rows) {
    const { key } = canonicalizeUrl(row.url);
    const existing = best.get(key);
    if (!existing || row.frecency > existing.frecency) {
      best.set(key, row);
    }
  }

  return [...best.values()];
}
