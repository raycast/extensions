import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorage } from "@raycast/api";
import { getAppEntries } from "../src/helpers/apps";
import { getHistoryPairKey } from "../src/helpers/history";
import {
  getCustomApps,
  getMigratedAppId,
  getStarredPairs,
  getUsageHistory,
  resetMigrationState,
  SCHEMA_VERSION,
  STORAGE_KEYS,
} from "../src/helpers/storage";

beforeEach(async () => {
  await LocalStorage.clear();
  resetMigrationState();
});

describe("storage boundary", () => {
  it("is the only module that touches LocalStorage directly", () => {
    const srcDir = join(__dirname, "../src");
    const files = readdirSync(srcDir, { recursive: true, encoding: "utf8" }).filter((file) => /\.tsx?$/.test(file));
    const offenders = files.filter(
      (file) =>
        file !== join("helpers", "storage.ts") && /\bLocalStorage\./.test(readFileSync(join(srcDir, file), "utf8")),
    );
    expect(files.length).toBeGreaterThan(10);
    expect(offenders).toEqual([]);
  });
});

describe("safe reads", () => {
  it("survives a corrupt value instead of throwing", async () => {
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, "{not json");
    await LocalStorage.setItem(STORAGE_KEYS.USAGE_HISTORY, JSON.stringify({ not: "a list" }));
    await expect(getCustomApps()).resolves.toEqual([]);
    await expect(getUsageHistory()).resolves.toEqual([]);
    expect((await getAppEntries()).length).toBeGreaterThan(0);
  });

  it("drops malformed rows and gives old History rows a count of 1", async () => {
    await LocalStorage.setItem(
      STORAGE_KEYS.USAGE_HISTORY,
      JSON.stringify([{ profile: "alice", app: "x", appName: "X", timestamp: 5 }, null, { profile: "no-app" }]),
    );
    expect(await getUsageHistory()).toEqual([{ profile: "alice", app: "x", appName: "X", timestamp: 5, count: 1 }]);
  });
});

describe("schema 2 migration", () => {
  const seed = async () => {
    const legacy = "producthunt-com-test";
    await LocalStorage.setItem(
      STORAGE_KEYS.CUSTOM_APPS,
      JSON.stringify([
        { name: "Product Hunt", value: legacy, urlTemplate: "https://www.producthunt.com/@{profile}" },
        { name: "Mastodon", value: "mastodon-social", urlTemplate: "https://mastodon.social/@{profile}" },
      ]),
    );
    await LocalStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify([{ value: legacy, visible: false }]));
    await LocalStorage.setItem(
      STORAGE_KEYS.USAGE_HISTORY,
      JSON.stringify([{ profile: "rrhoover", app: legacy, appName: "Product Hunt", timestamp: 1, count: 3 }]),
    );
    await LocalStorage.setItem(STORAGE_KEYS.STARRED_HISTORY_ITEMS, JSON.stringify([`${legacy}::rrhoover`]));
    await LocalStorage.setItem(STORAGE_KEYS.LAST_SELECTED_APP, JSON.stringify(legacy));
  };

  it("renames -test IDs and carries every reference along", async () => {
    await seed();

    const apps = await getCustomApps();
    expect(apps.map((app) => app.value)).toEqual(["producthunt-com", "mastodon-social"]);
    expect(JSON.parse((await LocalStorage.getItem(STORAGE_KEYS.APP_SETTINGS)) as string)).toEqual([
      { value: "producthunt-com", visible: false },
    ]);
    expect((await getUsageHistory())[0]).toMatchObject({ app: "producthunt-com", count: 3 });
    expect(await getStarredPairs()).toEqual([getHistoryPairKey("rrhoover", "producthunt-com")]);
    // The view's own key is left for the view to follow, so a migration can't overwrite a newer choice
    expect(JSON.parse((await LocalStorage.getItem(STORAGE_KEYS.LAST_SELECTED_APP)) as string)).toBe(
      "producthunt-com-test",
    );
    expect(await getMigratedAppId("producthunt-com-test")).toBe("producthunt-com");
    resetMigrationState(); // another process, which finds the data already migrated
    expect(await getMigratedAppId("producthunt-com-test")).toBe("producthunt-com");
    expect(JSON.parse((await LocalStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)) as string)).toBe(SCHEMA_VERSION);
  });

  it("runs once: a later app with an old-style ID is left alone", async () => {
    await getCustomApps(); // migrates an empty store to schema 2
    resetMigrationState();
    await seed();
    expect((await getCustomApps())[0].value).toBe("producthunt-com-test");
  });

  it("keeps an ID whose fixed form is already taken", async () => {
    await LocalStorage.setItem(
      STORAGE_KEYS.CUSTOM_APPS,
      JSON.stringify([
        { name: "PH", value: "producthunt-com", urlTemplate: "https://www.producthunt.com/{profile}" },
        { name: "PH @", value: "producthunt-com-test", urlTemplate: "https://www.producthunt.com/@{profile}" },
      ]),
    );
    expect((await getCustomApps()).map((app) => app.value)).toEqual(["producthunt-com", "producthunt-com-test"]);
  });
});
