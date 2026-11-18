import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorage } from "@raycast/api";
import { addCustomApp } from "../src/helpers/apps";
import { withFileLock } from "../src/helpers/file-lock";
import {
  getHistory,
  MAX_HISTORY_ITEMS,
  recordProfileOpen,
  setHistoryItemStarred,
  toggleStarredHistoryItem,
} from "../src/helpers/history";
import { getCustomApps, getStarredPairs, resetMigrationState, setUsageHistory } from "../src/helpers/storage";

beforeEach(async () => {
  await LocalStorage.clear();
  resetMigrationState();
});

describe("storage lock", () => {
  it("keeps every open when ten are recorded at once", async () => {
    await Promise.all(Array.from({ length: 10 }, () => recordProfileOpen("alice", "x", "X")));
    expect((await getHistory()).map((item) => item.count)).toEqual([10]);
  });

  it("keeps every app added at once", async () => {
    await Promise.all(
      ["a", "b", "c", "d"].map((name) => addCustomApp({ name, urlTemplate: `https://${name}.example/{profile}` })),
    );
    expect((await getCustomApps()).map((app) => app.name).sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("keeps every star toggled at once", async () => {
    await Promise.all(["a", "b", "c"].map((profile) => toggleStarredHistoryItem(profile, "x")));
    expect(await getStarredPairs()).toHaveLength(3);
  });

  it("two requests to star the same profile leave it starred", async () => {
    const results = await Promise.all([
      setHistoryItemStarred("alice", "x", true),
      setHistoryItemStarred("alice", "x", true),
    ]);
    expect(results.sort()).toEqual([false, true]);
    expect(await getStarredPairs()).toHaveLength(1);
  });

  it("refuses a write made outside the lock", async () => {
    await expect(setUsageHistory([])).rejects.toThrow("outside withStorageLock");
  });

  it("waits for a lock another process holds", async () => {
    const { environment } = await import("@raycast/api");
    const order: string[] = [];
    let release = () => {};
    let acquired = () => {};
    const isHeld = new Promise<void>((resolve) => (acquired = resolve));
    const held = withFileLock(`${environment.supportPath}/storage`, async () => {
      order.push("other process");
      acquired();
      await new Promise<void>((resolve) => (release = resolve));
    });
    await isHeld;
    const open = recordProfileOpen("alice", "x", "X").then(() => order.push("open"));
    await new Promise((resolve) => setTimeout(resolve, 100));
    const waited = [...order];
    release();
    await Promise.all([held, open]);
    expect(waited).toEqual(["other process"]);
    expect(order).toEqual(["other process", "open"]);
  });
});

describe("History cap", () => {
  it("keeps 100 profiles", async () => {
    expect(MAX_HISTORY_ITEMS).toBe(100);
    for (let index = 0; index <= MAX_HISTORY_ITEMS; index++) await recordProfileOpen(`p${index}`, "x", "X");
    expect(await getHistory()).toHaveLength(MAX_HISTORY_ITEMS);
  });
});
