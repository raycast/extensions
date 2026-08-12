import { describe, expect, it } from "vitest";
import {
  buildSearchUrl,
  FALLBACK_SUGGESTION_CONFIG,
  getSuggestionSourceConfig,
  searchEngineToConfig,
} from "../../src/utils/suggestion-helpers";

describe("suggestion helpers", () => {
  it("builds Chromium template URLs", () => {
    expect(buildSearchUrl("https://duckduckgo.com/?q={searchTerms}", "C++ site:example.com")).toBe(
      "https://duckduckgo.com/?q=C%2B%2B%20site%3Aexample.com",
    );
  });

  it("maps known Helium engines to suggestion parsers", () => {
    const config = searchEngineToConfig({
      name: "DuckDuckGo",
      keyword: "duckduckgo.com",
      searchUrl: "https://duckduckgo.com/?q={searchTerms}",
      suggestionsUrl: "https://duckduckgo.com/ac/?q={searchTerms}&type=list",
    });

    expect(config.name).toBe("DuckDuckGo");
    expect(config.suggestionsParser?.([{ phrase: "raycast" }])).toEqual(["raycast"]);
  });

  it("falls back to DuckDuckGo suggestions for unknown provider formats", () => {
    const config = searchEngineToConfig({
      name: "Custom",
      keyword: "custom.example",
      searchUrl: "https://custom.example/search?q={searchTerms}",
      suggestionsUrl: "https://custom.example/suggest?q={searchTerms}",
    });

    const sourceConfig = getSuggestionSourceConfig(config);

    expect(sourceConfig.suggestionsUrl).toBe(FALLBACK_SUGGESTION_CONFIG.suggestionsUrl);
    expect(sourceConfig.suggestionsParser?.([{ phrase: "raycast" }])).toEqual(["raycast"]);
  });
});
