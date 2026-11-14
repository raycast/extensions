import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorage } from "@raycast/api";
import { addCustomApp, getAppEntries, updateCustomApp } from "../src/helpers/apps";
import { getHistory, recordProfileOpen, renameHistoryProfile, toggleStarredHistoryItem } from "../src/helpers/history";
import { getStarredPairs, resetMigrationState } from "../src/helpers/storage";

beforeEach(async () => {
  await LocalStorage.clear();
  resetMigrationState();
});

describe("custom apps", () => {
  it("keeps the ID when the URL template is edited", async () => {
    const app = await addCustomApp({ name: "Product Hunt", urlTemplate: "https://www.producthunt.com/@{profile}" });
    expect(app.value).toBe("producthunt-com");

    await updateCustomApp(app.value, { name: "Product Hunt", urlTemplate: "https://producthunt.com/u/{profile}" });
    const entry = (await getAppEntries()).find((candidate) => candidate.name === "Product Hunt");
    expect(entry).toMatchObject({ value: "producthunt-com", urlTemplate: "https://producthunt.com/u/{profile}" });
  });

  it("refuses a second app for the same site, including a built-in one", async () => {
    await expect(addCustomApp({ name: "GH", urlTemplate: "http://www.github.com/{profile}/" })).rejects.toThrow(
      '"GitHub" already opens profiles on this site',
    );
  });

  it("gives a different site with the same generated ID a suffix", async () => {
    await addCustomApp({ name: "One", urlTemplate: "https://example.com/{profile}" });
    const second = await addCustomApp({ name: "Two", urlTemplate: "https://example.com/?u={profile}" });
    expect(second.value).toBe("example-com-2");
  });
});

describe("open counts", () => {
  it("counts opens per profile + app, ignoring case and a leading @", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    await recordProfileOpen("Alice", "x", "X");
    vi.setSystemTime(2000);
    await recordProfileOpen("@alice", "x", "X");
    await recordProfileOpen("alice", "github", "GitHub");
    vi.useRealTimers();

    const history = await getHistory();
    expect(history).toHaveLength(2);
    expect(history.find((item) => item.app === "x")).toMatchObject({ profile: "alice", count: 2, timestamp: 2000 });
    expect(history.find((item) => item.app === "github")).toMatchObject({ count: 1 });
  });

  it("merges counts and keeps the star when a profile is renamed onto an existing one", async () => {
    await recordProfileOpen("old", "x", "X");
    await recordProfileOpen("new", "x", "X");
    await recordProfileOpen("new", "x", "X");
    await toggleStarredHistoryItem("old", "x");

    await renameHistoryProfile("old", "x", "new");
    const history = await getHistory();
    expect(history).toEqual([expect.objectContaining({ profile: "new", count: 3 })]);
    expect(await getStarredPairs()).toEqual(["x::new"]);
  });
});
