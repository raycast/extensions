import { LocalStorage } from "@raycast/api";
import {
  loadHistory,
  addToHistory,
  removeFromHistory,
  clearHistory,
  getRecentWords,
} from "../src/utils/history";
import type { HistoryEntry } from "../src/utils/types";

// Reset LocalStorage mock state between tests
beforeEach(() => {
  // @ts-expect-error _reset is a test-only helper on the mock
  (LocalStorage as { _reset: () => void })._reset();
  jest.clearAllMocks();
});

// ─── loadHistory ─────────────────────────────────────────────────────────────

describe("loadHistory", () => {
  it("returns an empty array when storage is empty", async () => {
    const history = await loadHistory();
    expect(history).toEqual([]);
  });

  it("returns parsed entries when storage has data", async () => {
    const entries: HistoryEntry[] = [
      { word: "maison", endpoint: "definition", timestamp: 1000 },
    ];
    (LocalStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(entries));
    const history = await loadHistory();
    expect(history).toHaveLength(1);
    expect(history[0].word).toBe("maison");
  });

  it("returns empty array on malformed JSON", async () => {
    (LocalStorage.getItem as jest.Mock).mockResolvedValueOnce("{invalid json");
    const history = await loadHistory();
    expect(history).toEqual([]);
  });
});

// ─── addToHistory ─────────────────────────────────────────────────────────────

describe("addToHistory", () => {
  it("adds a new entry to an empty history", async () => {
    await addToHistory("maison", "definition");
    expect(LocalStorage.setItem).toHaveBeenCalledTimes(1);
    const [, value] = (LocalStorage.setItem as jest.Mock).mock.calls[0] as [string, string];
    const stored = JSON.parse(value) as HistoryEntry[];
    expect(stored[0].word).toBe("maison");
    expect(stored[0].endpoint).toBe("definition");
  });

  it("prepends new entries (most recent first)", async () => {
    // Seed with one existing entry
    const existing: HistoryEntry[] = [
      { word: "chat", endpoint: "definition", timestamp: 1000 },
    ];
    (LocalStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existing));

    await addToHistory("chien", "definition");

    const [, value] = (LocalStorage.setItem as jest.Mock).mock.calls[0] as [string, string];
    const stored = JSON.parse(value) as HistoryEntry[];
    expect(stored[0].word).toBe("chien");
    expect(stored[1].word).toBe("chat");
  });

  it("deduplicates entries (same word + endpoint)", async () => {
    const existing: HistoryEntry[] = [
      { word: "maison", endpoint: "definition", timestamp: 1000 },
      { word: "chat", endpoint: "definition", timestamp: 900 },
    ];
    (LocalStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existing));

    await addToHistory("maison", "definition");

    const [, value] = (LocalStorage.setItem as jest.Mock).mock.calls[0] as [string, string];
    const stored = JSON.parse(value) as HistoryEntry[];
    const maisonEntries = stored.filter((e) => e.word === "maison");
    expect(maisonEntries).toHaveLength(1);
    expect(stored[0].word).toBe("maison"); // moved to front
  });

  it("does not exceed maxSize", async () => {
    const existing: HistoryEntry[] = Array.from({ length: 5 }, (_, i) => ({
      word: `word${i}`,
      endpoint: "definition" as const,
      timestamp: i,
    }));
    (LocalStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existing));

    await addToHistory("newword", "definition", 5);

    const [, value] = (LocalStorage.setItem as jest.Mock).mock.calls[0] as [string, string];
    const stored = JSON.parse(value) as HistoryEntry[];
    expect(stored.length).toBeLessThanOrEqual(5);
  });

  it("does nothing when maxSize is 0", async () => {
    await addToHistory("maison", "definition", 0);
    expect(LocalStorage.setItem).not.toHaveBeenCalled();
  });

  it("same word with different endpoint creates separate entries", async () => {
    const existing: HistoryEntry[] = [
      { word: "maison", endpoint: "definition", timestamp: 1000 },
    ];
    (LocalStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existing));

    await addToHistory("maison", "synonymie");

    const [, value] = (LocalStorage.setItem as jest.Mock).mock.calls[0] as [string, string];
    const stored = JSON.parse(value) as HistoryEntry[];
    const maisonEntries = stored.filter((e) => e.word === "maison");
    expect(maisonEntries).toHaveLength(2);
  });
});

// ─── removeFromHistory ────────────────────────────────────────────────────────

describe("removeFromHistory", () => {
  it("removes the specified word+endpoint entry", async () => {
    const existing: HistoryEntry[] = [
      { word: "maison", endpoint: "definition", timestamp: 1000 },
      { word: "chat", endpoint: "definition", timestamp: 900 },
    ];
    (LocalStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existing));

    await removeFromHistory("maison", "definition");

    const [, value] = (LocalStorage.setItem as jest.Mock).mock.calls[0] as [string, string];
    const stored = JSON.parse(value) as HistoryEntry[];
    expect(stored.every((e) => e.word !== "maison")).toBe(true);
  });

  it("leaves other entries intact", async () => {
    const existing: HistoryEntry[] = [
      { word: "maison", endpoint: "definition", timestamp: 1000 },
      { word: "chat", endpoint: "definition", timestamp: 900 },
    ];
    (LocalStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existing));

    await removeFromHistory("maison", "definition");

    const [, value] = (LocalStorage.setItem as jest.Mock).mock.calls[0] as [string, string];
    const stored = JSON.parse(value) as HistoryEntry[];
    expect(stored).toHaveLength(1);
    expect(stored[0].word).toBe("chat");
  });
});

// ─── clearHistory ─────────────────────────────────────────────────────────────

describe("clearHistory", () => {
  it("calls LocalStorage.removeItem with the correct key", async () => {
    await clearHistory();
    expect(LocalStorage.removeItem).toHaveBeenCalledWith("cnrtl_search_history");
  });
});

// ─── getRecentWords ───────────────────────────────────────────────────────────

describe("getRecentWords", () => {
  it("returns unique words in recency order", async () => {
    const existing: HistoryEntry[] = [
      { word: "maison", endpoint: "definition", timestamp: 3000 },
      { word: "chat", endpoint: "definition", timestamp: 2000 },
      { word: "maison", endpoint: "synonymie", timestamp: 1000 }, // duplicate word
    ];
    (LocalStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existing));

    const words = await getRecentWords(10);
    expect(words).toEqual(["maison", "chat"]); // maison appears once
  });

  it("respects the limit parameter", async () => {
    const existing: HistoryEntry[] = Array.from({ length: 20 }, (_, i) => ({
      word: `word${i}`,
      endpoint: "definition" as const,
      timestamp: i,
    }));
    (LocalStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existing));

    const words = await getRecentWords(5);
    expect(words).toHaveLength(5);
  });

  it("returns empty array when history is empty", async () => {
    const words = await getRecentWords();
    expect(words).toEqual([]);
  });
});
