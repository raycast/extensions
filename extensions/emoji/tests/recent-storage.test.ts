import { describe, expect, it, vi } from "vitest";
import { RECENTS_KEY, RecentEmojiStorage } from "../src/recent-storage";
function storage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: vi.fn(async (key: string) => data.get(key)),
    setItem: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
  };
}
describe("RecentEmojiStorage", () => {
  it("migrates existing history to unique identifiers without deleting the original", async () => {
    const original = JSON.stringify([{ emoji: "🚀", description: "rocket" }, { emoji: "🫡" }, { emoji: "🚀" }]);
    const db = storage({ "recently-used": original });
    const history = new RecentEmojiStorage(db);
    expect(await history.load()).toEqual(["🚀", "🫡"]);
    expect(JSON.parse(db.data.get(RECENTS_KEY)!)).toEqual(["🚀", "🫡"]);
    expect(db.data.get("recently-used")).toBe(original);
  });
  it("waits for the write and serializes rapid uses without losing either", async () => {
    const db = storage({ [RECENTS_KEY]: '["🫡"]' });
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    db.setItem.mockImplementationOnce(async (key, value) => {
      await gate;
      db.data.set(key, value);
    });
    const history = new RecentEmojiStorage(db);
    let firstFinished = false;
    const first = history.record("🚀").then(() => {
      firstFinished = true;
    });
    const second = history.record("🔥");
    await vi.waitFor(() => expect(db.setItem).toHaveBeenCalledTimes(1));
    expect(firstFinished).toBe(false);
    release();
    await first;
    expect(await second).toEqual(["🔥", "🚀", "🫡"]);
    expect(JSON.parse(db.data.get(RECENTS_KEY)!)).toEqual(["🔥", "🚀", "🫡"]);
  });
  it("reports write failures and can recover on the next action", async () => {
    const db = storage({ [RECENTS_KEY]: '["🫡"]' });
    db.setItem.mockRejectedValueOnce(new Error("disk unavailable"));
    const history = new RecentEmojiStorage(db);
    await expect(history.record("🚀")).rejects.toThrow("disk unavailable");
    expect(await history.record("🔥")).toEqual(["🔥", "🫡"]);
  });
  it("does not overwrite corrupt history", async () => {
    const db = storage({ [RECENTS_KEY]: "broken" });
    await expect(new RecentEmojiStorage(db).record("🚀")).rejects.toThrow();
    expect(db.setItem).not.toHaveBeenCalled();
    expect(db.data.get(RECENTS_KEY)).toBe("broken");
  });
  it("moves a reused item to the front and retains 25 unique entries", async () => {
    const ids = Array.from({ length: 25 }, (_, i) => String(i));
    const db = storage({ [RECENTS_KEY]: JSON.stringify(ids) });
    const history = new RecentEmojiStorage(db);
    expect((await history.record("24"))[0]).toBe("24");
    const updated = await history.record("new");
    expect(updated).toHaveLength(25);
    expect(updated.slice(0, 3)).toEqual(["new", "24", "0"]);
    expect(new Set(updated).size).toBe(25);
  });
});
