import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAutoSearchResults, getStaticResult } from "../src/utils/handleResults";

describe("handleResults - Static and Auto Suggest Results", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getStaticResult", () => {
    it("generates a static SearchResult item for non-empty text", () => {
      const results = getStaticResult("raycast extensions");
      expect(results).toHaveLength(1);
      expect(results[0].query).toBe("raycast extensions");
      expect(results[0].description).toBe("Search Google for 'raycast extensions'");
      expect(results[0].url).toBe("https://www.google.com/search?q=raycast%20extensions");
      expect(results[0].id).toBeDefined();
    });

    it("returns an empty array for empty or whitespace-only queries", () => {
      expect(getStaticResult("")).toEqual([]);
      expect(getStaticResult("   ")).toEqual([]);
    });
  });

  describe("getAutoSearchResults", () => {
    it("parses valid Google Autosuggest response with query and navigation items", async () => {
      const mockResponse = [
        "raycast",
        ["raycast", "raycast.com", "raycast ai"],
        ["", "Open URL", ""],
        [],
        {
          "google:suggesttype": ["QUERY", "NAVIGATION", "QUERY"],
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response);

      const controller = new AbortController();
      const results = await getAutoSearchResults("raycast", controller.signal);

      expect(results).toHaveLength(3);

      // First item: query
      expect(results[0].query).toBe("raycast");
      expect(results[0].isNavigation).toBeUndefined();
      expect(results[0].url).toBe("https://www.google.com/search?q=raycast");

      // Second item: navigation
      expect(results[1].query).toBe("raycast.com");
      expect(results[1].isNavigation).toBe(true);
      expect(results[1].description).toBe("Open URL");
      expect(results[1].url).toBe("https://raycast.com");

      // Third item: query
      expect(results[2].query).toBe("raycast ai");
      expect(results[2].isNavigation).toBeUndefined();
      expect(results[2].url).toBe("https://www.google.com/search?q=raycast%20ai");
    });

    it("handles response without suggesttype safely as regular queries", async () => {
      const mockResponse = ["test", ["test 1", "test 2"], ["", ""]];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response);

      const controller = new AbortController();
      const results = await getAutoSearchResults("test", controller.signal);

      expect(results).toHaveLength(2);
      expect(results[0].query).toBe("test 1");
      expect(results[0].isNavigation).toBeUndefined();
      expect(results[1].query).toBe("test 2");
      expect(results[1].isNavigation).toBeUndefined();
    });

    it("throws a descriptive error when HTTP response fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      } as unknown as Response);

      const controller = new AbortController();
      await expect(getAutoSearchResults("fail", controller.signal)).rejects.toThrow(
        "Google suggestions returned 503 Service Unavailable",
      );
    });

    it("handles malformed JSON structure safely", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: "not an array" }),
      } as unknown as Response);

      const controller = new AbortController();
      const results = await getAutoSearchResults("bad-json", controller.signal);
      expect(results).toEqual([]);
    });
  });
});
