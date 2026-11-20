import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import { withCache } from "@raycast/utils";

const execFileAsync = promisify(execFile);

/**
 * Deterministic title → streaming deep-link resolution via JustWatch's GraphQL
 * API (the same backend justwatch.com uses; keyless, non-commercial use).
 * This replaces LLM-guessed title IDs with real per-provider URLs.
 * Results are cached for 24h to keep API usage polite.
 */

const GRAPHQL_URL = "https://apis.justwatch.com/graphql";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const SEARCH_QUERY = `query GetSearchTitles($searchTitlesFilter: TitleFilter!, $country: Country!, $language: Language!, $first: Int!, $filter: OfferFilter!) {
  popularTitles(country: $country, filter: $searchTitlesFilter, first: $first, sortBy: POPULAR, sortRandomSeed: 0) {
    edges {
      node {
        content(country: $country, language: $language) {
          title
        }
        ... on MovieOrShowOrSeason {
          offers(country: $country, platform: WEB, filter: $filter) {
            monetizationType
            standardWebURL
            deeplinkURL(platform: TVOS)
            package {
              technicalName
              clearName
            }
          }
        }
      }
    }
  }
}`;

export interface StreamingOffer {
  url: string;
  /** The provider's own tvOS link, when it publishes one. These usually start playback and resume. */
  tvUrl?: string;
  monetizationType: string;
  provider: { technicalName: string; clearName: string };
}

export interface ResolvedTitle {
  title: string;
  offers: StreamingOffer[];
}

let detectedCountry: string | null = null;

/** Country from the extension preference, else auto-detected from the Mac's region setting. */
async function country(): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();
  const fromPref = (prefs.country ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(fromPref)) return fromPref;

  if (!detectedCountry) {
    try {
      // macOS region, e.g. "en_AU" → AU
      const { stdout } = await execFileAsync("/usr/bin/defaults", ["read", "-g", "AppleLocale"]);
      detectedCountry = stdout.trim().match(/_([A-Z]{2})\b/)?.[1] ?? "US";
    } catch {
      detectedCountry = "US";
    }
  }
  return detectedCountry;
}

// Region is an explicit argument so it lands in withCache's key: results are
// per-country, and a cache shared across regions would hand back the wrong
// streaming provider.
const fetchTitle = withCache(
  async (query: string, region: string): Promise<ResolvedTitle | null> => {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "GetSearchTitles",
        variables: {
          first: 1,
          searchTitlesFilter: { searchQuery: query },
          country: region,
          language: "en",
          filter: { bestOnly: true },
        },
        query: SEARCH_QUERY,
      }),
    });
    if (!response.ok) throw new Error(`JustWatch lookup failed (HTTP ${response.status})`);

    const json = (await response.json()) as {
      data?: {
        popularTitles?: {
          edges?: {
            node: {
              content?: { title?: string };
              offers?: {
                monetizationType?: string;
                standardWebURL?: string;
                deeplinkURL?: string | null;
                package?: { technicalName?: string; clearName?: string };
              }[];
            };
          }[];
        };
      };
    };

    const node = json.data?.popularTitles?.edges?.[0]?.node;
    if (!node) return null;
    return {
      title: node.content?.title ?? "",
      offers: (node.offers ?? []).flatMap(({ standardWebURL: url, deeplinkURL, monetizationType, package: pkg }) =>
        url && pkg?.technicalName
          ? [
              {
                url,
                tvUrl: deeplinkURL ?? undefined,
                monetizationType: monetizationType ?? "UNKNOWN",
                provider: { technicalName: pkg.technicalName, clearName: pkg.clearName ?? pkg.technicalName },
              },
            ]
          : [],
      ),
    };
  },
  { maxAge: CACHE_TTL_MS },
);

export async function searchTitle(query: string): Promise<ResolvedTitle | null> {
  // Lowercased so the cache key ignores casing; the search itself is case-insensitive.
  const resolved = await fetchTitle(query.trim().toLowerCase(), await country());
  return resolved && { ...resolved, title: resolved.title || query.trim() };
}
