import { LocalStorage } from "@raycast/api";
import { beforeEach } from "vitest";
import {
  HISTORY_LIMIT,
  addToHistory,
  clearHistory,
  loadHistory,
  removeFromHistory,
} from "./history";

const STORAGE_KEY = "quickAddHistory";

beforeEach(async () => {
  await LocalStorage.clear();
});

describe("loadHistory", () => {
  it("returns an empty list when nothing is stored", async () => {
    expect(await loadHistory()).toEqual([]);
  });

  it("returns an empty list for malformed JSON", async () => {
    await LocalStorage.setItem(STORAGE_KEY, "{not json");
    expect(await loadHistory()).toEqual([]);
  });

  it("returns an empty list when the stored value is not an array", async () => {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify({ a: 1 }));
    expect(await loadHistory()).toEqual([]);
  });

  it("drops non-string and blank entries", async () => {
    await LocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(["good", 42, null, "   ", "also good"]),
    );
    expect(await loadHistory()).toEqual(["good", "also good"]);
  });

  it("trims stored entries", async () => {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(["  padded  "]));
    expect(await loadHistory()).toEqual(["padded"]);
  });

  it("caps an oversized stored list", async () => {
    const oversized = Array.from(
      { length: HISTORY_LIMIT + 10 },
      (_, i) => `e${i}`,
    );
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(oversized));
    expect(await loadHistory()).toHaveLength(HISTORY_LIMIT);
  });
});

describe("addToHistory", () => {
  it("stores the raw input so relative dates are re-parsed on reuse", async () => {
    await addToHistory("Buy milk tomorrow *shopping");
    expect(await loadHistory()).toEqual(["Buy milk tomorrow *shopping"]);
  });

  it("puts the newest entry first", async () => {
    await addToHistory("first");
    await addToHistory("second");
    expect(await loadHistory()).toEqual(["second", "first"]);
  });

  it("ignores blank input", async () => {
    await addToHistory("   ");
    expect(await loadHistory()).toEqual([]);
  });

  it("trims before storing", async () => {
    await addToHistory("  spaced  ");
    expect(await loadHistory()).toEqual(["spaced"]);
  });

  it("moves a reused entry to the front instead of duplicating it", async () => {
    await addToHistory("a");
    await addToHistory("b");
    await addToHistory("a");
    expect(await loadHistory()).toEqual(["a", "b"]);
  });

  it("collapses duplicates case-insensitively", async () => {
    await addToHistory("Buy Milk");
    await addToHistory("buy milk");
    const history = await loadHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toBe("buy milk");
  });

  it("evicts the oldest entry beyond the limit", async () => {
    for (let i = 0; i < HISTORY_LIMIT + 3; i++) {
      await addToHistory(`entry-${i}`);
    }
    const history = await loadHistory();
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0]).toBe(`entry-${HISTORY_LIMIT + 2}`);
    expect(history).not.toContain("entry-0");
  });

  it("returns the updated list", async () => {
    expect(await addToHistory("x")).toEqual(["x"]);
  });
});

describe("removeFromHistory", () => {
  it("removes a single entry", async () => {
    await addToHistory("a");
    await addToHistory("b");
    expect(await removeFromHistory("a")).toEqual(["b"]);
  });

  it("matches case-insensitively", async () => {
    await addToHistory("Buy Milk");
    expect(await removeFromHistory("buy milk")).toEqual([]);
  });

  it("is a no-op for an unknown entry", async () => {
    await addToHistory("a");
    expect(await removeFromHistory("nope")).toEqual(["a"]);
  });
});

describe("clearHistory", () => {
  it("drops everything", async () => {
    await addToHistory("a");
    await addToHistory("b");
    await clearHistory();
    expect(await loadHistory()).toEqual([]);
  });
});
