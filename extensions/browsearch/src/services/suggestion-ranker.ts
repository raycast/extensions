import type { MozPlacesRow, Suggestion, OpenTarget } from "../types";
import { dedupeByCanonical } from "./url-canonical";

function isPrefixMatch(row: MozPlacesRow, term: string): boolean {
  if (!term) return false;
  const lower = term.toLowerCase();
  if ((row.title ?? "").toLowerCase().startsWith(lower)) return true;
  try {
    const host = new URL(row.url).hostname.toLowerCase().replace(/^www\./, "");
    return host.startsWith(lower);
  } catch {
    return false;
  }
}

export function rankSuggestions(rows: readonly MozPlacesRow[], term: string): Suggestion[] {
  return dedupeByCanonical(rows)
    .sort((a, b) => {
      const aPfx = isPrefixMatch(a, term) ? 1 : 0;
      const bPfx = isPrefixMatch(b, term) ? 1 : 0;
      if (bPfx !== aPfx) return bPfx - aPfx;
      if (b.frecency !== a.frecency) return b.frecency - a.frecency;
      return b.visit_count - a.visit_count;
    })
    .map((row) => ({
      id: row.url,
      title: row.title ?? row.url,
      url: row.url,
      frecency: row.frecency,
      visitCount: row.visit_count,
    }));
}

export function resolveSuggestionOpenTarget(suggestion: Suggestion): OpenTarget {
  return { kind: "history", url: suggestion.url };
}

export function looksLikeUrl(rawQuery: string): boolean {
  const trimmed = rawQuery.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed);
}

export function resolveRawOpenTarget(rawQuery: string, searchEngineBaseUrl: string): OpenTarget {
  const trimmed = rawQuery.trim();
  if (looksLikeUrl(trimmed)) {
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return { kind: "url", url };
  }
  return {
    kind: "search",
    url: searchEngineBaseUrl + encodeURIComponent(trimmed),
  };
}
