import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
/** Runs once, between the first read and the write of an update, to play the other command. */
let betweenReads: (() => void) | undefined;

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: async (key: string) => {
      const value = store.get(key);
      if (key === "soren-idle-save" && betweenReads) {
        const hook = betweenReads;
        betweenReads = undefined;
        queueMicrotask(hook);
      }
      return value;
    },
    setItem: async (key: string, value: string) => void store.set(key, value),
    removeItem: async (key: string) => void store.delete(key),
  },
}));

import { newGame } from "./engine";
import { corruptSave, loadState, saveState, takeSaveNotice, update } from "./storage";

beforeEach(() => {
  store.clear();
  betweenReads = undefined;
});

describe("a save that cannot be read", () => {
  it("is set aside instead of being overwritten", async () => {
    store.set("soren-idle-save", "{not json");
    const state = await loadState();
    expect(state.stats.cycles).toBe(0);
    expect(await corruptSave()).toBe("{not json");
    expect(await takeSaveNotice()).toMatch(/save/);
    expect(await takeSaveNotice()).toBeUndefined();
  });

  it("keeps the broken save even after the next update writes a fresh one", async () => {
    store.set("soren-idle-save", "garbage");
    await update();
    expect(JSON.parse(store.get("soren-idle-save") ?? "{}").version).toBeTruthy();
    expect(await corruptSave()).toBe("garbage");
  });

  it("does not raise a notice for a healthy or missing save", async () => {
    await loadState();
    await saveState(newGame(1));
    await loadState();
    expect(await takeSaveNotice()).toBeUndefined();
  });
});

describe("overlapping updates", () => {
  it("run one after another without dropping changes", async () => {
    await saveState(newGame(Date.now()));
    await Promise.all(
      Array.from({ length: 10 }, () => update((s) => ({ ...s, credits: s.credits + 1 }))),
    );
    expect((await loadState()).credits).toBe(10);
  });

  it("redo the change when the other command saved in the middle", async () => {
    await saveState({ ...newGame(Date.now()), credits: 0 });
    betweenReads = () => {
      const other = JSON.parse(store.get("soren-idle-save") ?? "{}");
      store.set("soren-idle-save", JSON.stringify({ ...other, credits: other.credits + 100 }));
    };
    await update((s) => ({ ...s, credits: s.credits + 1 }));
    expect((await loadState()).credits).toBe(101);
  });
});
