import { mkdirSync, mkdtempSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
/** Runs once, between the first read and the write of an update, to play the other command. */
let betweenReads: (() => void) | undefined;

const support = vi.hoisted(() => ({ path: "" }));

vi.mock("@raycast/api", () => ({
  environment: {
    get supportPath() {
      return support.path;
    },
  },
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
import { corruptSave, loadState, replaceState, resetState, saveState, takeSaveNotice, update } from "./storage";

beforeEach(() => {
  support.path = mkdtempSync(join(tmpdir(), "soren-idle-test-"));
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
    await Promise.all(Array.from({ length: 10 }, () => update((s) => ({ ...s, credits: s.credits + 1 }))));
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

describe("the save lock", () => {
  const lock = () => join(support.path, "save.lock");

  it("makes an update wait for the other command to finish", async () => {
    await saveState({ ...newGame(Date.now()), credits: 5 });
    mkdirSync(lock());
    let done = false;
    const pending = update((s) => ({ ...s, credits: s.credits + 1 })).then(() => (done = true));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(done).toBe(false);
    rmSync(lock(), { recursive: true });
    await pending;
    expect((await loadState()).credits).toBe(6);
  });

  it("takes over a lock left behind by a command that died", async () => {
    await saveState({ ...newGame(Date.now()), credits: 5 });
    mkdirSync(lock());
    const old = new Date(Date.now() - 60_000);
    utimesSync(lock(), old, old);
    await update((s) => ({ ...s, credits: s.credits + 1 }));
    expect((await loadState()).credits).toBe(6);
  });

  it("covers an import and a reset as well, and lets go afterwards", async () => {
    await replaceState({ ...newGame(Date.now()), credits: 42 });
    expect((await loadState()).credits).toBe(42);
    await resetState();
    expect(store.has("soren-idle-save")).toBe(false);
    await update((s) => s);
  });
});
