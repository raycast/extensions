import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorage } from "@raycast/api";
import { addCustomApp, findVisibleApp, removeCustomApp } from "../src/helpers/apps";
import { getHistory, MAX_HISTORY_ITEMS, recordProfileOpen, removeHistoryItem } from "../src/helpers/history";
import {
  getCustomApps,
  getMigratedAppId,
  getStarredPairs,
  getUsageHistory,
  resetMigrationState,
  STORAGE_KEYS,
} from "../src/helpers/storage";
import { generateAppValue, getTemplateOrigin, normalizeUrlTemplate } from "../src/helpers/url";
import { describeImportSummary, importSettingsFromYAML } from "../src/yaml-settings";

beforeEach(async () => {
  await LocalStorage.clear();
  resetMigrationState();
  vi.restoreAllMocks();
});

const LEGACY_APP = {
  name: "Product Hunt",
  value: "producthunt-com-test",
  urlTemplate: "https://www.producthunt.com/@{profile}",
};

describe("migration", () => {
  it("finishes on retry after a write fails partway, leaving no reference on the old ID", async () => {
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify([LEGACY_APP]));
    await LocalStorage.setItem(
      STORAGE_KEYS.USAGE_HISTORY,
      JSON.stringify([{ profile: "rrhoover", app: LEGACY_APP.value, appName: "Product Hunt", timestamp: 1 }]),
    );
    await LocalStorage.setItem(STORAGE_KEYS.STARRED_HISTORY_ITEMS, JSON.stringify([`${LEGACY_APP.value}::rrhoover`]));

    const realSetItem = LocalStorage.setItem;
    let failed = false;
    vi.spyOn(LocalStorage, "setItem").mockImplementation(async (key: string, value: string) => {
      if (key === STORAGE_KEYS.STARRED_HISTORY_ITEMS && !failed) {
        failed = true;
        throw new Error("disk full");
      }
      return realSetItem(key, value);
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(getCustomApps()).rejects.toThrow("disk full");
    expect(failed).toBe(true);
    const apps = await getCustomApps(); // retried
    expect(apps[0].value).toBe("producthunt-com");
    expect((await getUsageHistory())[0].app).toBe("producthunt-com");
    expect(await getStarredPairs()).toEqual(["producthunt-com::rrhoover"]);
  });

  it("fails a write that starts during a failed migration instead of saving a stale app list", async () => {
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify([LEGACY_APP]));
    await LocalStorage.setItem(
      STORAGE_KEYS.USAGE_HISTORY,
      JSON.stringify([{ profile: "rrhoover", app: LEGACY_APP.value, appName: "Product Hunt", timestamp: 1 }]),
    );
    await LocalStorage.setItem(STORAGE_KEYS.STARRED_HISTORY_ITEMS, JSON.stringify([`${LEGACY_APP.value}::rrhoover`]));
    const realSetItem = LocalStorage.setItem;
    let failed = false;
    vi.spyOn(LocalStorage, "setItem").mockImplementation(async (key: string, value: string) => {
      if (key === STORAGE_KEYS.STARRED_HISTORY_ITEMS && !failed) {
        failed = true;
        throw new Error("disk full");
      }
      return realSetItem(key, value);
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(addCustomApp({ name: "Mastodon", urlTemplate: "https://mastodon.social/@{profile}" })).rejects.toThrow(
      "disk full",
    );
    await addCustomApp({ name: "Mastodon", urlTemplate: "https://mastodon.social/@{profile}" });
    expect((await getCustomApps()).map((app) => app.value)).toEqual(["producthunt-com", "mastodon-social"]);
    expect((await getUsageHistory())[0].app).toBe("producthunt-com");
  });

  it("tells views holding a pre-migration ID where it went", async () => {
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify([LEGACY_APP]));
    expect(await getMigratedAppId(LEGACY_APP.value)).toBe("producthunt-com");
    expect(await getMigratedAppId("github")).toBe("github");
  });
});

describe("legacy History shapes", () => {
  it("reads case variants of one pair as one entry, opens added up", async () => {
    await LocalStorage.setItem(
      STORAGE_KEYS.USAGE_HISTORY,
      JSON.stringify([
        { profile: "Alice", app: "x", appName: "X", timestamp: 2 },
        { profile: "alice", app: "x", appName: "X", timestamp: 1 },
      ]),
    );
    expect(await getHistory()).toEqual([{ profile: "Alice", app: "x", appName: "X", timestamp: 2, count: 2 }]);
    await removeHistoryItem("alice", "x");
    expect(await getHistory()).toEqual([]);
  });

  it("reads old starred keys with extra @ signs in the current format", async () => {
    await LocalStorage.setItem(STORAGE_KEYS.STARRED_HISTORY_ITEMS, JSON.stringify(["x::@alice", "x::alice"]));
    expect(await getStarredPairs()).toEqual(["x::alice"]);
  });
});

describe("app IDs", () => {
  it("never hands a deleted app's ID, still referenced by History, to a new app", async () => {
    const first = await addCustomApp({ name: "One", urlTemplate: "https://example.com/{profile}" });
    await recordProfileOpen("alice", first.value, "One");
    await removeCustomApp(first.value);
    const second = await addCustomApp({ name: "Two", urlTemplate: "https://example.com/?u={profile}" });
    expect(second.value).not.toBe(first.value);
  });

  it("prefers an exact ID over a display name", async () => {
    await addCustomApp({ name: "mastodon-social", urlTemplate: "https://example.com/{profile}" });
    const mastodon = await addCustomApp({ name: "Mastodon", urlTemplate: "https://mastodon.social/@{profile}" });
    expect(mastodon.value).toBe("mastodon-social");
    expect((await findVisibleApp("mastodon-social"))?.urlTemplate).toBe("https://mastodon.social/@{profile}");
  });
});

describe("URL templates", () => {
  it("keeps ports and hash routes apart", () => {
    expect(normalizeUrlTemplate("https://github.com:8443/{profile}")).not.toBe(
      normalizeUrlTemplate("https://github.com/{profile}"),
    );
    expect(normalizeUrlTemplate("https://example.com/#/u/{profile}")).not.toBe(
      normalizeUrlTemplate("https://example.com/#/org/{profile}"),
    );
  });

  it("doesn't confuse literal text with the placeholder", () => {
    expect(normalizeUrlTemplate("https://zzprofilezz.example.com/{profile}")).not.toBe(
      normalizeUrlTemplate("https://{profile}.example.com/{profile}"),
    );
    expect(generateAppValue("https://zzprofilezz.example.com/{profile}")).toBe("zzprofilezz-example-com");
    expect(getTemplateOrigin("https://zzprofilezz.example.com/{profile}")).toBe("https://zzprofilezz.example.com");
  });
});

describe("import edge cases", () => {
  it("rejects a non-http custom app instead of matching it to a built-in", async () => {
    const summary = await importSettingsFromYAML(`
version: '1.0'
customApps:
  - { name: FTP GitHub, value: ftp-gh, urlTemplate: 'ftp://github.com/{profile}' }
`);
    expect(summary).toMatchObject({ appsFailed: 1, appsPresent: 0 });
  });

  it("skips infinite timestamps and counts instead of letting them displace real visits", async () => {
    const summary = await importSettingsFromYAML(`
version: '1.0'
usageHistory:
  - { profile: forever, app: x, appName: X, timestamp: .inf, count: .inf }
  - { profile: real, app: x, appName: X, timestamp: 5, count: .inf }
`);
    expect(summary).toMatchObject({ historyAdded: 1, historySkipped: 1 });
    expect(await getHistory()).toEqual([{ profile: "real", app: "x", appName: "X", timestamp: 5, count: 1 }]);
  });

  it("doesn't report a row the History cap drops as added", async () => {
    for (let index = 0; index < MAX_HISTORY_ITEMS; index++) await recordProfileOpen(`recent${index}`, "x", "X");
    const summary = await importSettingsFromYAML(`
version: '1.0'
usageHistory:
  - { profile: ancient, app: x, appName: X, timestamp: 1 }
`);
    expect(summary).toMatchObject({ historyAdded: 0, historyTooOld: 1 });
    expect(describeImportSummary(summary)).toBe("No apps added · History unchanged (1 older than the 100 kept)");
  });
});
