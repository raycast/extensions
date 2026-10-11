import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock @raycast/api LocalStorage
// ---------------------------------------------------------------------------

const store = new Map<string, string>();

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  },
}));

import { HistoryManager } from "./SessionManager";

// ---------------------------------------------------------------------------
// HistoryManager
// ---------------------------------------------------------------------------

describe("HistoryManager", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  describe("load", () => {
    it("returns empty targetOrder when storage is empty", async () => {
      expect(await HistoryManager.load()).toEqual({ targetOrder: [] });
    });

    it("returns stored history", async () => {
      store.set(
        "retype_history",
        JSON.stringify({ targetOrder: ["ru", "en"] }),
      );
      expect(await HistoryManager.load()).toEqual({
        targetOrder: ["ru", "en"],
      });
    });

    it("returns empty targetOrder when stored value is invalid JSON", async () => {
      store.set("retype_history", "bad-json");
      expect(await HistoryManager.load()).toEqual({ targetOrder: [] });
    });
  });

  describe("recordSuccess", () => {
    it("adds a new layout id to the front when history is empty", async () => {
      await HistoryManager.recordSuccess("ru");
      expect(await HistoryManager.load()).toEqual({ targetOrder: ["ru"] });
    });

    it("moves an existing id to the front without duplication", async () => {
      store.set(
        "retype_history",
        JSON.stringify({ targetOrder: ["en", "ru", "be"] }),
      );
      await HistoryManager.recordSuccess("ru");
      expect((await HistoryManager.load()).targetOrder).toEqual([
        "ru",
        "en",
        "be",
      ]);
    });

    it("prepends a brand-new id before existing ones", async () => {
      store.set(
        "retype_history",
        JSON.stringify({ targetOrder: ["en", "ru"] }),
      );
      await HistoryManager.recordSuccess("be");
      expect((await HistoryManager.load()).targetOrder).toEqual([
        "be",
        "en",
        "ru",
      ]);
    });

    it("does not duplicate the id when it is already first", async () => {
      store.set(
        "retype_history",
        JSON.stringify({ targetOrder: ["ru", "en"] }),
      );
      await HistoryManager.recordSuccess("ru");
      const history = await HistoryManager.load();
      expect(history.targetOrder).toEqual(["ru", "en"]);
      expect(history.targetOrder.filter((id) => id === "ru").length).toBe(1);
    });

    it("handles a single-element history correctly", async () => {
      store.set("retype_history", JSON.stringify({ targetOrder: ["en"] }));
      await HistoryManager.recordSuccess("ru");
      expect((await HistoryManager.load()).targetOrder).toEqual(["ru", "en"]);
    });
  });
});
