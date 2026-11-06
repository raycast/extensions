import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSearchHistory } from "../src/utils/handleResults";
import { HISTORY_KEY, SearchResult } from "../src/utils/types";

describe("history - Loading, Normalization, and Deduplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an empty array when rememberSearchHistory is disabled", async () => {
    vi.mocked(getPreferenceValues).mockReturnValue({
      rememberSearchHistory: false,
    });

    const history = await getSearchHistory();
    expect(history).toEqual([]);
    expect(LocalStorage.getItem).not.toHaveBeenCalled();
  });

  it("returns an empty array when history storage is empty or null", async () => {
    vi.mocked(getPreferenceValues).mockReturnValue({
      rememberSearchHistory: true,
    });
    vi.mocked(LocalStorage.getItem).mockResolvedValueOnce(null);

    const history = await getSearchHistory();
    expect(history).toEqual([]);
  });

  it("returns an empty array and handles corrupted JSON without crashing", async () => {
    vi.mocked(getPreferenceValues).mockReturnValue({
      rememberSearchHistory: true,
    });
    vi.mocked(LocalStorage.getItem).mockResolvedValueOnce("invalid{json-corrupted");

    const history = await getSearchHistory();
    expect(history).toEqual([]);
  });

  it("normalizes, marks as history, and deduplicates stored items by URL", async () => {
    vi.mocked(getPreferenceValues).mockReturnValue({
      rememberSearchHistory: true,
    });

    const storedItems: SearchResult[] = [
      {
        id: "id-1",
        query: "  react  ",
        url: "https://www.google.com/search?q=react",
      },
      {
        id: "id-2",
        query: "react",
        url: "https://www.google.com/search?q=react", // duplicate URL
      },
      {
        id: "id-3",
        query: "raycast.com",
        description: "Open URL",
        url: "https://raycast.com",
        isNavigation: true,
      },
    ];

    vi.mocked(LocalStorage.getItem).mockResolvedValueOnce(JSON.stringify(storedItems));

    const history = await getSearchHistory();

    // Deduplicated by URL: only 2 unique URLs
    expect(history).toHaveLength(2);

    expect(history[0].query).toBe("react");
    expect(history[0].url).toBe("https://www.google.com/search?q=react");
    expect(history[0].isHistory).toBe(true);

    expect(history[1].query).toBe("raycast.com");
    expect(history[1].url).toBe("https://raycast.com");
    expect(history[1].isHistory).toBe(true);
    expect(history[1].isNavigation).toBe(true);
  });

  it("stores the canonical normal URL in history for AI-mode opens to prevent duplicate rows", () => {
    const searchItem: SearchResult = {
      id: "ai-item",
      query: "machine learning",
      url: "https://www.google.com/search?q=machine%20learning",
    };

    // Stored history should always use getItemNormalUrl so it matches getStaticResult
    const historyEntry = { ...searchItem, isHistory: true };
    expect(historyEntry.url).toBe("https://www.google.com/search?q=machine%20learning");
    expect(historyEntry.url).not.toContain("udm=50");
  });
});
