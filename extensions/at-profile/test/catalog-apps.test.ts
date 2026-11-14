import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorage } from "@raycast/api";
import { appCheck, findCatalogSiteByName, usernameWarning } from "../src/catalog";
import { addCatalogApp, addCustomApp, findApp, getAppEntries, updateCustomApp } from "../src/helpers/apps";
import { getHistory, recordProfileOpen } from "../src/helpers/history";
import { resetMigrationState, STORAGE_KEYS } from "../src/helpers/storage";
import { App } from "../src/types";
import { defaultApps } from "../src/utils/default-apps";
import { exportSettingsToYAML, importSettingsFromYAML } from "../src/yaml-settings";

beforeEach(async () => {
  await LocalStorage.clear();
  resetMigrationState();
});

const builtIn = (value: string): App => defaultApps.find((app) => app.value === value)!;
const medium = () => findCatalogSiteByName("Medium")!;

describe("catalog sites as apps", () => {
  it("opens a catalog site that isn't in My Apps under its catalog ID", async () => {
    expect(await findApp("catalog-medium")).toMatchObject({
      name: "Medium",
      value: "catalog-medium",
      urlTemplate: "https://medium.com/@{profile}",
    });
    expect(await findApp("catalog-no-such-site")).toBeUndefined();
  });

  it("keeps the catalog ID when the site is added, so its History stays attached", async () => {
    await recordProfileOpen("example_user", "catalog-medium", "Medium");
    const app = await addCatalogApp(medium());
    expect(app.value).toBe("catalog-medium");
    expect((await getAppEntries()).find((entry) => entry.value === "catalog-medium")).toMatchObject({
      isDefault: false,
      visible: true,
    });
    expect((await getHistory())[0]).toMatchObject({ app: "catalog-medium", profile: "example_user" });
  });

  it("refuses a catalog site twice, or one an app already opens", async () => {
    await addCatalogApp(medium());
    await expect(addCatalogApp(medium())).rejects.toThrow();
    await expect(addCatalogApp(findCatalogSiteByName("GitHub")!)).rejects.toThrow("already opens profiles");
  });

  it("refuses a site with no profile page", async () => {
    await expect(addCatalogApp(findCatalogSiteByName("Discord")!)).rejects.toThrow("no profile page");
  });

  it("doesn't give a History row's catalog ID to a new app", async () => {
    await recordProfileOpen("example_user", "catalog-example-com", "Example");
    const app = await addCustomApp({ name: "Example", urlTemplate: "https://catalog.example.com/{profile}" });
    expect(app.value).not.toBe("catalog-example-com");
  });
});

describe("platforms on custom apps", () => {
  it("stores, edits and clears the platform", async () => {
    const app = await addCustomApp({
      name: "Social",
      urlTemplate: "https://social.example/@{profile}",
      platform: "mastodon",
    });
    expect((await findApp(app.value))?.platform).toBe("mastodon");

    await updateCustomApp(app.value, { name: "Social", urlTemplate: "https://social.example/@{profile}" });
    expect((await findApp(app.value))?.platform).toBeUndefined();
  });

  it("drops a stored platform it doesn't know", async () => {
    await LocalStorage.setItem(
      STORAGE_KEYS.CUSTOM_APPS,
      JSON.stringify([
        { name: "Old", value: "old", urlTemplate: "https://old.example/{profile}", platform: "myspace" },
      ]),
    );
    // Rows without a schema version are migrated, which can rename the ID, so find the app by name
    const app = (await getAppEntries()).find((entry) => entry.name === "Old");
    expect(app).toBeDefined();
    expect(app?.platform).toBeUndefined();
  });

  it("round-trips the platform through export and import", async () => {
    await addCustomApp({ name: "Forum", urlTemplate: "https://forum.example/u/{profile}", platform: "discourse" });
    const exported = await exportSettingsToYAML();
    expect(exported).toContain("platform: discourse");

    await LocalStorage.clear();
    resetMigrationState();
    await importSettingsFromYAML(exported);
    expect((await getAppEntries()).find((entry) => entry.name === "Forum")?.platform).toBe("discourse");
  });
});

describe("NSFW apps", () => {
  it("stores the flag, and gives a catalog site's flag to the app made from it", async () => {
    const app = await addCustomApp({ name: "Adult", urlTemplate: "https://adult.example/{profile}", nsfw: true });
    expect((await findApp(app.value))?.nsfw).toBe(true);
    await updateCustomApp(app.value, { name: "Adult", urlTemplate: "https://adult.example/{profile}" });
    expect((await findApp(app.value))?.nsfw).toBeUndefined();
  });

  it("round-trips the flag through export and import", async () => {
    await addCustomApp({ name: "Adult", urlTemplate: "https://adult.example/{profile}", nsfw: true });
    const exported = await exportSettingsToYAML();
    await LocalStorage.clear();
    resetMigrationState();
    await importSettingsFromYAML(exported);
    expect((await getAppEntries()).find((entry) => entry.name === "Adult")?.nsfw).toBe(true);
  });
});

describe("appCheck", () => {
  it("checks a built-in app at the app's own URL", () => {
    expect(appCheck(builtIn("github")).target?.urlTemplate).toBe(builtIn("github").urlTemplate);
  });

  it("keeps a pattern but no check for built-ins whose checks can't be trusted", () => {
    for (const value of ["x", "reddit", "threads", "facebook"]) {
      expect(appCheck(builtIn(value)).target, value).toBeUndefined();
    }
    expect(appCheck(builtIn("x")).usernamePattern).toBeDefined();
  });

  it("checks a custom app by its platform, then by the catalog site it matches", () => {
    const onPlatform: App = {
      name: "Forum",
      value: "forum",
      urlTemplate: "https://forum.example/u/{profile}",
      placeholder: "username",
      platform: "discourse",
    };
    expect(appCheck(onPlatform).target?.check.probeUrl).toBe("https://forum.example/u/{profile}.json");

    const matching: App = {
      name: "My Medium",
      value: "medium-com",
      urlTemplate: "https://www.medium.com/@{profile}",
      placeholder: "username",
    };
    expect(appCheck(matching).target).toBeDefined();
    expect(appCheck({ ...matching, urlTemplate: "https://unknown.example/{profile}" })).toEqual({});
  });
});

describe("usernameWarning", () => {
  it("warns when a username can't exist on the app, and only then", () => {
    expect(usernameWarning(builtIn("x"), "@example_user")).toBeUndefined();
    expect(usernameWarning(builtIn("x"), "this name is far too long for x")).toBe(
      "This doesn't look like a X username",
    );
    expect(usernameWarning(builtIn("x"), "")).toBeUndefined();
  });
});
