import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { RecentEntry } from "../types";

// ---------------------------------------------------------------------------
// Mock @raycast/api LocalStorage
// ---------------------------------------------------------------------------

const store: Record<string, string> = {};

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(async (key: string) => store[key] ?? undefined),
    setItem: vi.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
  },
}));

// Import after mocking so the module picks up the mock
let getRecents: (typeof import("../utils/recents"))["getRecents"];
let addRecent: (typeof import("../utils/recents"))["addRecent"];

beforeAll(async () => {
  ({ getRecents, addRecent } = await import("../utils/recents"));
});

const STORAGE_KEY = "recent-guides";

function makeEntry(
  id: string,
  overrides: Partial<RecentEntry> = {},
): RecentEntry {
  return {
    id,
    url: `https://www.icy-veins.com/wow/${id}-guide`,
    title: `${id} — Guide`,
    specSlug: id.split("-")[0],
    addedAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  for (const key of Object.keys(store)) {
    delete store[key];
  }
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getRecents
// ---------------------------------------------------------------------------

describe("getRecents()", () => {
  it("returns empty array when nothing is stored", async () => {
    expect(await getRecents()).toEqual([]);
  });

  it("returns parsed entries from storage", async () => {
    const entries = [
      makeEntry("shadow-priest-pve-guide"),
      makeEntry("frost-mage-pve-guide"),
    ];
    store[STORAGE_KEY] = JSON.stringify(entries);
    const result = await getRecents();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("shadow-priest-pve-guide");
    expect(result[1].id).toBe("frost-mage-pve-guide");
  });

  it("returns empty array on malformed JSON", async () => {
    store[STORAGE_KEY] = "not-valid-json{{";
    expect(await getRecents()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// addRecent
// ---------------------------------------------------------------------------

describe("addRecent()", () => {
  it("prepends a new entry, keeping only the most recent", async () => {
    const a = makeEntry("shadow-priest-pve-guide");
    const b = makeEntry("frost-mage-pve-guide");
    await addRecent(a);
    await addRecent(b);
    const result = await getRecents();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("frost-mage-pve-guide");
  });

  it("deduplicates by id, moving existing entry to front", async () => {
    const a = makeEntry("shadow-priest-pve-guide", { addedAt: 1 });
    const b = makeEntry("frost-mage-pve-guide", { addedAt: 2 });
    await addRecent(a);
    await addRecent(b);
    // Re-add 'a' — should replace b since cap is 1
    const aRefreshed = makeEntry("shadow-priest-pve-guide", { addedAt: 3 });
    await addRecent(aRefreshed);
    const result = await getRecents();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("shadow-priest-pve-guide");
    expect(result[0].addedAt).toBe(3);
  });

  it("caps stored entries at 1 (MAX_RECENTS)", async () => {
    for (let i = 0; i < 3; i++) {
      await addRecent(makeEntry(`entry-${i}`));
    }
    const result = await getRecents();
    expect(result).toHaveLength(1);
    // Most recent entry is at the front
    expect(result[0].id).toBe("entry-2");
  });
});
