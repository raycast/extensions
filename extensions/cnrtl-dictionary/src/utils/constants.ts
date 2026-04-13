import type { CnrtlEndpoint } from "./types";

export const CNRTL_BASE_URL = "https://www.cnrtl.fr";

export const CNRTL_ENDPOINTS: Record<CnrtlEndpoint, string> = {
  definition: "definition",
  synonymie: "synonymie",
  antonymie: "antonymie",
  etymologie: "etymologie",
  morphologie: "morphologie",
};

export function buildCnrtlUrl(endpoint: CnrtlEndpoint, word: string): string {
  const slug = encodeURIComponent(word.trim().toLowerCase());
  return `${CNRTL_BASE_URL}/${CNRTL_ENDPOINTS[endpoint]}/${slug}`;
}

/** Minimum word length accepted before firing a request */
export const MIN_SEARCH_LENGTH = 2;

/** LocalStorage key for search history */
export const HISTORY_STORAGE_KEY = "cnrtl_search_history";

/** Default maximum number of history entries */
export const DEFAULT_HISTORY_SIZE = 50;

/**
 * HTTP headers sent with every request to CNRTL.
 * A realistic User-Agent avoids being blocked by the server.
 */
export const FETCH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
  "Cache-Control": "max-age=0",
};

/** Cache TTL in milliseconds (6 hours) */
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** Degree labels shown in the UI for synonyms/antonyms */
export const DEGREE_LABELS: Record<number, string> = {
  3: "Très proche",
  2: "Proche",
  1: "Lié",
};

export const DEGREE_DOTS: Record<number, string> = {
  3: "●●●",
  2: "●●○",
  1: "●○○",
};
