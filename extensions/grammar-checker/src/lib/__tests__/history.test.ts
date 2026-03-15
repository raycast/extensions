import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock LocalStorage
const store: Record<string, string> = {};
vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: async (key: string) => store[key],
    setItem: async (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: async (key: string) => {
      delete store[key];
    },
  },
}));

import {
  getHistory,
  addHistoryEntry,
  clearHistory,
  HistoryEntry,
} from "../history";

beforeEach(() => {
  for (const key of Object.keys(store)) {
    delete store[key];
  }
});

describe("getHistory", () => {
  it("returns empty array when no history exists", async () => {
    const history = await getHistory();
    expect(history).toEqual([]);
  });

  it("returns stored entries", async () => {
    const entries: HistoryEntry[] = [
      {
        id: "1",
        original: "hello",
        corrected: "Hello.",
        hadChanges: true,
        timestamp: Date.now(),
      },
    ];
    store["grammar_check_history"] = JSON.stringify(entries);

    const history = await getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].original).toBe("hello");
  });

  it("filters out entries older than 7 days", async () => {
    const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const entries: HistoryEntry[] = [
      {
        id: "1",
        original: "old",
        corrected: "Old.",
        hadChanges: true,
        timestamp: old,
      },
      {
        id: "2",
        original: "new",
        corrected: "New.",
        hadChanges: true,
        timestamp: Date.now(),
      },
    ];
    store["grammar_check_history"] = JSON.stringify(entries);

    const history = await getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe("2");
  });

  it("limits to 50 entries", async () => {
    const entries: HistoryEntry[] = Array.from({ length: 60 }, (_, i) => ({
      id: String(i),
      original: `text ${i}`,
      corrected: `Text ${i}.`,
      hadChanges: true,
      timestamp: Date.now(),
    }));
    store["grammar_check_history"] = JSON.stringify(entries);

    const history = await getHistory();
    expect(history).toHaveLength(50);
  });

  it("returns empty array for corrupted storage", async () => {
    store["grammar_check_history"] = "not valid json{{{";
    const history = await getHistory();
    expect(history).toEqual([]);
  });
});

describe("addHistoryEntry", () => {
  it("adds an entry to empty history", async () => {
    await addHistoryEntry("hello world", "Hello world.");
    const history = await getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].original).toBe("hello world");
    expect(history[0].corrected).toBe("Hello world.");
    expect(history[0].hadChanges).toBe(true);
  });

  it("marks hadChanges as false when text is unchanged", async () => {
    await addHistoryEntry("Hello.", "Hello.");
    const history = await getHistory();
    expect(history[0].hadChanges).toBe(false);
  });

  it("prepends new entries (most recent first)", async () => {
    await addHistoryEntry("first", "First.");
    await addHistoryEntry("second", "Second.");
    const history = await getHistory();
    expect(history[0].original).toBe("second");
    expect(history[1].original).toBe("first");
  });

  it("generates unique IDs", async () => {
    await addHistoryEntry("a", "A.");
    await addHistoryEntry("b", "B.");
    const history = await getHistory();
    expect(history[0].id).not.toBe(history[1].id);
  });
});

describe("clearHistory", () => {
  it("removes all history", async () => {
    await addHistoryEntry("text", "Text.");
    await clearHistory();
    const history = await getHistory();
    expect(history).toEqual([]);
  });
});
