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
};

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
