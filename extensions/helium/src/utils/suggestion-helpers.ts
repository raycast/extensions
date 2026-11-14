import { FALLBACK_SEARCH_ENGINE, type HeliumSearchEngine } from "./helium-profile";

export type SuggestionApiResponse = unknown;

export interface SearchEngineConfig {
  name: string;
  searchUrl: string;
  suggestionsUrl?: string;
  suggestionsParser?: (json: SuggestionApiResponse) => string[];
}

const SUGGESTION_PARSERS: Record<string, Pick<SearchEngineConfig, "suggestionsParser">> = {
  google: {
    suggestionsParser: parseGoogleSuggestions,
  },
  "google.com": {
    suggestionsParser: parseGoogleSuggestions,
  },
  duckduckgo: {
    suggestionsParser: parseDuckDuckGoSuggestions,
  },
  "duckduckgo.com": {
    suggestionsParser: parseDuckDuckGoSuggestions,
  },
  ecosia: {
    suggestionsParser: parseGoogleSuggestions,
  },
  "ecosia.org": {
    suggestionsParser: parseGoogleSuggestions,
  },
  // Bing's osjson endpoint uses the same OpenSearch `[query, [suggestions]]` shape.
  bing: {
    suggestionsParser: parseGoogleSuggestions,
  },
  "bing.com": {
    suggestionsParser: parseGoogleSuggestions,
  },
};

/**
 * Engines offered by the extension's "Search Engine" preference. The default
 * value, "helium", follows the engine selected in Helium's own settings.
 */
export const SEARCH_ENGINE_OVERRIDES: Record<string, HeliumSearchEngine> = {
  google: {
    name: "Google",
    keyword: "google.com",
    searchUrl: "https://www.google.com/search?q={searchTerms}",
    suggestionsUrl: "https://www.google.com/complete/search?client=chrome&q={searchTerms}",
  },
  duckduckgo: FALLBACK_SEARCH_ENGINE,
  bing: {
    name: "Bing",
    keyword: "bing.com",
    searchUrl: "https://www.bing.com/search?q={searchTerms}",
    suggestionsUrl: "https://www.bing.com/osjson.aspx?query={searchTerms}",
  },
  yahoo: {
    name: "Yahoo",
    keyword: "yahoo.com",
    searchUrl: "https://search.yahoo.com/search?p={searchTerms}",
  },
  ecosia: {
    name: "Ecosia",
    keyword: "ecosia.org",
    searchUrl: "https://www.ecosia.org/search?q={searchTerms}",
    suggestionsUrl: "https://ac.ecosia.org/?type=list&q={searchTerms}",
  },
};

/**
 * The engine picked in the extension's preferences, or `undefined` to follow
 * Helium (the "helium" default, an empty value, or an unknown value).
 */
export function getSearchEngineOverride(preference: string | undefined): HeliumSearchEngine | undefined {
  if (!preference || preference === "helium") return undefined;
  return Object.prototype.hasOwnProperty.call(SEARCH_ENGINE_OVERRIDES, preference)
    ? SEARCH_ENGINE_OVERRIDES[preference]
    : undefined;
}

export const FALLBACK_SUGGESTION_CONFIG: SearchEngineConfig = {
  name: FALLBACK_SEARCH_ENGINE.name,
  searchUrl: FALLBACK_SEARCH_ENGINE.searchUrl,
  suggestionsUrl: FALLBACK_SEARCH_ENGINE.suggestionsUrl,
  suggestionsParser: parseDuckDuckGoSuggestions,
};

export function searchEngineToConfig(engine: HeliumSearchEngine): SearchEngineConfig {
  const parser = SUGGESTION_PARSERS[engine.keyword]?.suggestionsParser;
  return {
    name: engine.name,
    searchUrl: engine.searchUrl,
    suggestionsUrl: engine.suggestionsUrl,
    suggestionsParser: parser,
  };
}

export function getSuggestionSourceConfig(config: SearchEngineConfig): SearchEngineConfig {
  if (config.suggestionsUrl && config.suggestionsParser) return config;
  return FALLBACK_SUGGESTION_CONFIG;
}

export function buildSearchUrl(templateUrl: string, searchText: string): string {
  if (templateUrl.includes("{searchTerms}")) {
    return templateUrl
      .replace(/\{searchTerms\}/g, encodeURIComponent(searchText))
      .replace(/\{language\}/g, "en-US")
      .replace(/\{count\}/g, "8");
  }
  return `${templateUrl}${encodeURIComponent(searchText)}`;
}

function parseGoogleSuggestions(json: SuggestionApiResponse): string[] {
  if (Array.isArray(json) && json.length >= 2 && Array.isArray(json[1])) {
    return json[1] as string[];
  }
  return [];
}

function parseDuckDuckGoSuggestions(json: SuggestionApiResponse): string[] {
  if (Array.isArray(json)) {
    return json.map((item: { phrase?: string }) => item.phrase).filter((phrase): phrase is string => !!phrase);
  }
  return [];
}
