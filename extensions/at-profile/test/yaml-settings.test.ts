import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorage } from "@raycast/api";
import { addCustomApp, getAppEntries } from "../src/helpers/apps";
import { getHistory, recordProfileOpen } from "../src/helpers/history";
import { resetMigrationState } from "../src/helpers/storage";
import {
  describeImportSummary,
  exportSettingsToYAML,
  importSettingsFromYAML,
  ImportSummary,
} from "../src/yaml-settings";

beforeEach(async () => {
  await LocalStorage.clear();
  resetMigrationState();
});

// Shaped like a real export from before the ID fix and before open counts
const LEGACY_EXPORT = `
version: '1.0'
usageHistory:
  - { profile: rrhoover, app: producthunt-com-test, appName: Product Hunt, timestamp: 1700000000300 }
  - { profile: chrismessina, app: x, appName: X, timestamp: 1700000000200 }
  - { profile: Chrismessina, app: x, appName: X, timestamp: 1700000000100 }
  - { profile: ghost, app: nowhere, appName: Nowhere, timestamp: 1700000000000 }
  - { profile: no-time, app: x, appName: X }
visible:
  facebook: false
  x: true
  gh: false
customApps:
  - { name: Product Hunt, value: producthunt-com-test, urlTemplate: 'https://www.producthunt.com/@{profile}', visible: true }
  - { name: Duplicate GitHub, value: gh, urlTemplate: 'https://www.github.com/{profile}', visible: false }
  - { name: Broken }
`;

describe("import", () => {
  it("imports a legacy export, following old app IDs to the new ones", async () => {
    const summary = await importSettingsFromYAML(LEGACY_EXPORT);
    expect(summary).toMatchObject({
      appsAdded: 1,
      appsPresent: 1,
      appsFailed: 1,
      historyAdded: 2,
      historyUpdated: 0,
      historySkipped: 2,
    });

    const entries = await getAppEntries();
    expect(entries.find((entry) => entry.value === "producthunt-com")).toBeDefined();
    expect(entries.find((entry) => entry.value === "facebook")?.visible).toBe(false);
    // Neither the duplicate app nor its alias in `visible` may hide the built-in GitHub
    expect(entries.find((entry) => entry.value === "github")?.visible).toBe(true);

    const history = await getHistory();
    expect(history.map((item) => [item.app, item.profile, item.count])).toEqual([
      ["producthunt-com", "rrhoover", 1],
      ["x", "chrismessina", 1],
    ]);
  });

  it("changes nothing when the same file is imported twice", async () => {
    await importSettingsFromYAML(LEGACY_EXPORT);
    const before = await exportSettingsToYAML();
    const summary = await importSettingsFromYAML(LEGACY_EXPORT);
    expect(summary).toMatchObject({ appsAdded: 0, appsPresent: 2, historyAdded: 0, historyUpdated: 0 });
    expect(await exportSettingsToYAML()).toBe(before);
  });

  it("round-trips an export, open counts included", async () => {
    await addCustomApp({ name: "Mastodon", urlTemplate: "https://mastodon.social/@{profile}" });
    await recordProfileOpen("gargron", "mastodon-social", "Mastodon");
    await recordProfileOpen("gargron", "mastodon-social", "Mastodon");
    const exported = await exportSettingsToYAML();
    expect(exported).toContain("count: 2");

    await LocalStorage.clear();
    resetMigrationState();
    await recordProfileOpen("gargron", "x", "X");
    const summary = await importSettingsFromYAML(exported);
    expect(summary).toMatchObject({ appsAdded: 1, historyAdded: 1 });
    expect((await getHistory()).find((item) => item.app === "mastodon-social")?.count).toBe(2);
  });

  it("keeps the stored open count when it is larger than the file's", async () => {
    for (let opened = 0; opened < 3; opened++) await recordProfileOpen("chrismessina", "x", "X");
    const summary = await importSettingsFromYAML(LEGACY_EXPORT);
    expect(summary.historyUpdated).toBe(1);
    const entry = (await getHistory()).find((item) => item.app === "x");
    expect(entry).toMatchObject({ count: 3, timestamp: 1700000000200 });
  });

  it("counts the apps it shows or hides", async () => {
    const file = "version: '1.0'\nvisible:\n  github: false\n  x: true\n  facebook: false\n";
    expect(await importSettingsFromYAML(file)).toMatchObject({ appsHidden: 2, appsShown: 0 });
    expect(await importSettingsFromYAML(file)).toMatchObject({ appsHidden: 0, appsShown: 0 });
    expect(await importSettingsFromYAML("version: '1.0'\nvisible:\n  github: true\n")).toMatchObject({
      appsHidden: 0,
      appsShown: 1,
    });
  });

  it("rejects a file that isn't an export", async () => {
    await expect(importSettingsFromYAML("just: text")).rejects.toThrow("Missing version field");
  });
});

describe("describeImportSummary", () => {
  const summary = (overrides: Partial<ImportSummary>): ImportSummary => ({
    appsAdded: 0,
    appsPresent: 0,
    appsFailed: 0,
    historyAdded: 0,
    historyUpdated: 0,
    historySkipped: 0,
    historyTooOld: 0,
    appsShown: 0,
    appsHidden: 0,
    ...overrides,
  });

  it.each([
    [
      { appsAdded: 1, appsPresent: 2, historyAdded: 19 },
      "1 app added (2 already set up) · 19 profiles added to History",
    ],
    [{ appsPresent: 2 }, "No apps added (2 already set up) · History unchanged"],
    [
      { historyAdded: 3, historyUpdated: 2, historySkipped: 1 },
      "No apps added · 3 profiles added to History, 2 updated (1 skipped)",
    ],
    [{ historyUpdated: 1, appsFailed: 1 }, "No apps added, 1 rejected · 1 History profile updated"],
    [{ appsHidden: 1 }, "No apps added · 1 app hidden · History unchanged"],
    [{ appsHidden: 2, appsShown: 1 }, "No apps added · 2 apps hidden, 1 shown · History unchanged"],
    [{ appsShown: 3 }, "No apps added · 3 apps shown · History unchanged"],
  ])("%o", (overrides, text) => {
    expect(describeImportSummary(summary(overrides))).toBe(text);
  });

  it("says when the file comes from a newer version", async () => {
    const imported = await importSettingsFromYAML("version: '2.0'\nusageHistory: []\n");
    expect(imported.unknownVersion).toBe("2.0");
    expect(describeImportSummary(imported)).toBe(
      "No apps added · History unchanged · From a newer version: some settings may not import",
    );
    expect((await importSettingsFromYAML("version: '1.0'\n")).unknownVersion).toBeUndefined();
    expect((await importSettingsFromYAML("version: 1.0\n")).unknownVersion).toBeUndefined();
  });
});
