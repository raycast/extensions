import { describe, expect, it } from "vitest";
import type { Suggestion } from "../../src/types";
import { partitionSearchWebSuggestions } from "../../src/utils/search-web-results";

describe("search web result grouping", () => {
  it("separates bangs, provider-backed web results, and direct URLs", () => {
    const suggestions: Suggestion[] = [
      {
        id: "search-default",
        query: "raycast",
        url: "https://duckduckgo.com/?q=raycast",
        type: "search",
      },
      {
        id: "bang-gh",
        query: "!gh raycast",
        url: "https://github.com/search?q=raycast",
        type: "bang",
        providerName: "GitHub",
      },
      {
        id: "url-direct",
        query: "example.com",
        url: "https://example.com",
        type: "url",
      },
      {
        id: "suggestion-1",
        query: "raycast extensions",
        url: "https://duckduckgo.com/?q=raycast%20extensions",
        type: "search",
      },
    ];

    expect(partitionSearchWebSuggestions(suggestions)).toEqual({
      bangSuggestions: [suggestions[1]],
      webSuggestions: [suggestions[0], suggestions[3]],
      urlSuggestions: [suggestions[2]],
    });
  });
});
