import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSearchHistory } from "../src/utils/handleResults";
import { executeAiSearch } from "../src/utils/resultUtils";
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

  it("exercises the real AI search open-and-save path: opens AI URL with udm=50 but records canonical URL in history", async () => {
    const searchItem: SearchResult = {
      id: "ai-item",
      query: "machine learning",
      description: "Search Google for 'machine learning'",
      url: "https://www.google.com/search?q=machine%20learning",
    };

    const addHistoryMock = vi.fn().mockResolvedValue(undefined);
    const openMock = vi.fn().mockResolvedValue(undefined);
    const closeWindowMock = vi.fn().mockResolvedValue(undefined);

    await executeAiSearch(searchItem, addHistoryMock, openMock, closeWindowMock);

    // 1. Browser is opened with AI overview URL containing udm=50
    expect(openMock).toHaveBeenCalledWith("https://www.google.com/search?q=machine%20learning&udm=50");
    expect(openMock.mock.calls[0][0]).toContain("&udm=50");

    // 2. Window is closed
    expect(closeWindowMock).toHaveBeenCalled();

    // 3. Stored history item uses canonical normal URL (WITHOUT udm=50) to prevent duplicate rows
    expect(addHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ai-item",
        query: "machine learning",
        url: "https://www.google.com/search?q=machine%20learning",
      }),
    );
    expect(addHistoryMock.mock.calls[0][0].url).not.toContain("udm=50");
  });

  it("exercises the real AI search open-and-save path for navigation items preserving safe destination URL", async () => {
    const navItem: SearchResult = {
      id: "ai-nav",
      query: "github.com",
      description: "Open URL",
      url: "https://github.com",
      isNavigation: true,
    };

    const addHistoryMock = vi.fn().mockResolvedValue(undefined);
    const openMock = vi.fn().mockResolvedValue(undefined);
    const closeWindowMock = vi.fn().mockResolvedValue(undefined);

    await executeAiSearch(navItem, addHistoryMock, openMock, closeWindowMock);

    // Navigation URLs must open directly without appending udm=50
    expect(openMock).toHaveBeenCalledWith("https://github.com");
    expect(addHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://github.com",
      }),
    );
  });
});
