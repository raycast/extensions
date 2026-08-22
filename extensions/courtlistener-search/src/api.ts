import { getPreferenceValues } from "@raycast/api";
import { withCache } from "@raycast/utils";
import { ApiUsage, CitationLookup, SearchResponse } from "./types";

const API_ROOT = "https://www.courtlistener.com/api/rest/v4";
export const WEB_ROOT = "https://www.courtlistener.com";
/** Published opinions don't change, and search requests are the scarce resource. */
export const CACHE_MAX_AGE = 30 * 60 * 1000;

export type ApiErrorKind = "auth" | "rate-limit" | "other";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** Seconds until the throttle lifts, straight from the 429. */
  readonly retryAfter?: number;

  constructor(kind: ApiErrorKind, message: string, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.retryAfter = retryAfter;
  }
}

function authHeader() {
  // `Preferences` is the ambient type generated into raycast-env.d.ts from the manifest, so a
  // change to the preference in package.json shows up here rather than drifting past a hand-copy.
  const { apiToken } = getPreferenceValues<Preferences>();
  return { Authorization: `Token ${apiToken}` };
}

/**
 * A 429 carries `Retry-After`, and the body says the same thing in words — so the wait can be
 * stated exactly without assuming anything about which limits this token has.
 */
async function throwForStatus(response: Response): Promise<never> {
  if (response.status === 401 || response.status === 403) {
    throw new ApiError("auth", "CourtListener rejected your API token.");
  }
  if (response.status === 429) {
    const header = Number(response.headers.get("retry-after"));
    throw new ApiError(
      "rate-limit",
      "You've hit CourtListener's rate limit.",
      Number.isFinite(header) && header > 0 ? header : undefined,
    );
  }
  throw new ApiError("other", `CourtListener returned ${response.status} ${response.statusText}.`);
}

/**
 * One page of full-text search results. Cached per cursor, so paging back through a query is free.
 *
 * Text queries only — a citation goes to `lookupCitation` instead. The full-text index tokenises a
 * citation into its parts and matches every opinion that mentions any of them, so asking it for
 * "135 S. Ct. 2584" returns thousands of cases rather than Obergefell.
 */
export const fetchPage = withCache(
  async function fetchPage(
    query: string,
    semantic: boolean,
    court: string,
    filedAfter: string,
    cursor: string,
  ): Promise<SearchResponse> {
    // `highlight=on` narrows the opinion excerpt to the line the query matched and marks the terms
    // in it. Without it the excerpt is the opening 500 characters, which is a caption block about
    // 45% of the time — the same space a summary would take, reading like one until you look.
    // CourtListener notes the flag costs it some performance, which is why it defaults to off.
    const params = new URLSearchParams({ q: query, type: "o", highlight: "on" });
    // Ranks by what the query means rather than which of its words appear, which is the difference
    // between "can police search a car after arresting the driver" finding vehicle-search cases
    // and finding a party named Police. Costs a few seconds a query; it embeds the text first.
    if (semantic) {
      params.set("semantic", "true");
    }
    if (court) {
      params.set("court", court);
    }
    if (filedAfter) {
      params.set("filed_after", filedAfter);
    }
    if (cursor) {
      params.set("cursor", cursor);
    }

    const response = await fetch(`${API_ROOT}/search/?${params.toString()}`, { headers: authHeader() });
    if (!response.ok) {
      await throwForStatus(response);
    }
    return (await response.json()) as SearchResponse;
  },
  { maxAge: CACHE_MAX_AGE },
);

/**
 * Citation lookup is throttled separately — 60 a minute against its own scope — so resolving a
 * citation never eats into the handful of searches available per minute. It also normalises
 * reporter abbreviations itself, which is a job better done by the people who maintain the
 * reporter database than by a lookup table here.
 */
export const lookupCitation = withCache(
  async function lookupCitation(text: string): Promise<CitationLookup[]> {
    const response = await fetch(`${API_ROOT}/citation-lookup/`, {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      await throwForStatus(response);
    }
    return (await response.json()) as CitationLookup[];
  },
  { maxAge: CACHE_MAX_AGE },
);

/**
 * What this token's limits actually are. Deliberately uncached, and free to call: CourtListener
 * keeps this endpoint out of every scope it reports, so checking never spends what it reports on.
 */
export async function fetchApiUsage(): Promise<ApiUsage> {
  const response = await fetch(`${API_ROOT}/api-usage/`, { headers: authHeader() });
  if (!response.ok) {
    await throwForStatus(response);
  }
  return (await response.json()) as ApiUsage;
}
