import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@raycast/api", () => {
  const store = new Map<string, string>();
  return {
    LocalStorage: {
      getItem: vi.fn(async (k: string) => store.get(k)),
      setItem: vi.fn(async (k: string, v: string) => {
        store.set(k, v);
      }),
      removeItem: vi.fn(async (k: string) => {
        store.delete(k);
      }),
      __reset: () => store.clear(),
    },
  };
});

import {
  loadHistory,
  recordHistory,
  deleteEntry,
  togglePin,
  clearHistory,
  MAX_ENTRIES,
  MAX_ITEMS_PER_ENTRY,
  HISTORY_KEY,
} from "./historyStore";
import { LocalStorage } from "@raycast/api";
import type { ExtractedItem } from "./extractUrls";

function mkItem(n: number): ExtractedItem {
  return {
    raw: `https://site${n}.com`,
    url: `https://site${n}.com`,
    type: "web",
    index: n,
  };
}

beforeEach(async () => {
  (LocalStorage as unknown as { __reset: () => void }).__reset();
  vi.clearAllMocks();
});

describe("loadHistory", () => {
  it("returns empty array when key missing", async () => {
    const entries = await loadHistory();
    expect(entries).toEqual([]);
  });

  it("returns empty array on corrupted JSON (defensive)", async () => {
    await LocalStorage.setItem(HISTORY_KEY, "{not json[]");
    const entries = await loadHistory();
    expect(entries).toEqual([]);
  });

  it("round-trips JSON-encoded entries", async () => {
    await recordHistory([mkItem(1), mkItem(2)], "selection", 2);
    const entries = await loadHistory();
    expect(entries).toHaveLength(1);
    expect(entries[0].items).toHaveLength(2);
    expect(entries[0].source).toBe("selection");
    expect(entries[0].totalCount).toBe(2);
    expect(entries[0].openedCount).toBe(2);
    expect(entries[0].truncated).toBe(false);
    expect(entries[0].typesBreakdown).toEqual({ web: 2 });
  });
});

describe("recordHistory — per-entry item cap (VIEW-02)", () => {
  it("caps items at MAX_ITEMS_PER_ENTRY and sets truncated=true", async () => {
    const items = Array.from({ length: MAX_ITEMS_PER_ENTRY + 5 }, (_, n) => mkItem(n));
    await recordHistory(items, "clipboard", items.length);
    const [entry] = await loadHistory();
    expect(entry.items).toHaveLength(MAX_ITEMS_PER_ENTRY);
    expect(entry.totalCount).toBe(MAX_ITEMS_PER_ENTRY + 5);
    expect(entry.truncated).toBe(true);
    // First 20 items preserved in input order.
    expect(entry.items[0].url).toBe("https://site0.com");
    expect(entry.items[MAX_ITEMS_PER_ENTRY - 1].url).toBe(`https://site${MAX_ITEMS_PER_ENTRY - 1}.com`);
  });

  it("preserves totalCount even when items list is capped", async () => {
    const items = Array.from({ length: 50 }, (_, n) => mkItem(n));
    await recordHistory(items, "selection", 50);
    const [entry] = await loadHistory();
    expect(entry.totalCount).toBe(50);
    expect(entry.items.length).toBe(MAX_ITEMS_PER_ENTRY);
  });

  it("skips no-op when items[] is empty", async () => {
    await recordHistory([], "selection", 0);
    const entries = await loadHistory();
    expect(entries).toHaveLength(0);
  });
});

describe("recordHistory — FIFO trim at MAX_ENTRIES (VIEW-02)", () => {
  it("keeps newest entries first, evicts oldest at cap", async () => {
    // Record MAX_ENTRIES + 5 entries; oldest 5 must be evicted.
    for (let n = 0; n < MAX_ENTRIES + 5; n++) {
      await recordHistory([mkItem(n)], "selection", 1);
    }
    const entries = await loadHistory();
    expect(entries).toHaveLength(MAX_ENTRIES);
    // Newest entry's only item URL is `site${MAX_ENTRIES + 4}.com`.
    expect(entries[0].items[0].url).toBe(`https://site${MAX_ENTRIES + 4}.com`);
    // Oldest surviving entry corresponds to n=5 (n=0..4 evicted).
    expect(entries[MAX_ENTRIES - 1].items[0].url).toBe("https://site5.com");
  });
});

describe("deleteEntry / togglePin (VIEW-04)", () => {
  it("deleteEntry removes by id", async () => {
    await recordHistory([mkItem(1)], "selection", 1);
    await recordHistory([mkItem(2)], "selection", 1);
    const [a, b] = await loadHistory();
    await deleteEntry(a.id);
    const after = await loadHistory();
    expect(after.map((e) => e.id)).toEqual([b.id]);
  });

  it("togglePin flips pinned: true ↔ undefined (never false)", async () => {
    await recordHistory([mkItem(1)], "selection", 1);
    const [entry] = await loadHistory();
    expect(entry.pinned).toBeUndefined();

    await togglePin(entry.id);
    const [pinned] = await loadHistory();
    expect(pinned.pinned).toBe(true);

    await togglePin(entry.id);
    const [unpinned] = await loadHistory();
    expect(unpinned.pinned).toBeUndefined();
    // Critical: NEVER stored as `false` — JSON round-trip drops `undefined`.
    expect(Object.prototype.hasOwnProperty.call(unpinned, "pinned")).toBe(false);
  });
});

describe("trim — pin protection (LD-P4-03)", () => {
  it("never evicts pinned entries even when cap exceeded", async () => {
    // 1) Record 10 entries, pin entries #0 (oldest after we add more) and #5.
    for (let n = 0; n < 10; n++) {
      await recordHistory([mkItem(n)], "selection", 1);
    }
    const initial = await loadHistory();
    // initial[9] is the OLDEST (n=0) because newest-first prepend; initial[0] is newest (n=9).
    // We want to pin the n=0 and n=5 entries → those are at indices 9 and 4.
    await togglePin(initial[9].id);
    await togglePin(initial[4].id);

    // 2) Record MAX_ENTRIES + 50 MORE entries; pinned must survive.
    for (let n = 100; n < 100 + MAX_ENTRIES + 50; n++) {
      await recordHistory([mkItem(n)], "selection", 1);
    }

    const after = await loadHistory();
    expect(after).toHaveLength(MAX_ENTRIES);

    // Both pinned entries still present (regardless of order; trim() puts pinned first).
    const pinnedSurvivors = after.filter((e) => e.pinned === true);
    expect(pinnedSurvivors).toHaveLength(2);
    const pinnedUrls = pinnedSurvivors.map((e) => e.items[0].url).sort();
    expect(pinnedUrls).toEqual(["https://site0.com", "https://site5.com"]);

    // Unpinned slots filled with newest unpinned entries: 100 + MAX_ENTRIES + 49 down to 100 + 2.
    // (Pinned take 2 slots, so unpinned fills MAX_ENTRIES - 2 most-recent unpinned.)
    const unpinned = after.filter((e) => e.pinned !== true);
    expect(unpinned).toHaveLength(MAX_ENTRIES - 2);
    expect(unpinned[0].items[0].url).toBe(`https://site${100 + MAX_ENTRIES + 50 - 1}.com`);
  });
});

describe("clearHistory", () => {
  it("removes the LocalStorage key", async () => {
    await recordHistory([mkItem(1)], "selection", 1);
    expect((await loadHistory()).length).toBe(1);
    await clearHistory();
    expect((await loadHistory()).length).toBe(0);
  });
});
