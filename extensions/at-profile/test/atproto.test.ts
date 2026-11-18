import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorage } from "@raycast/api";
import { appCheck, catalogSites, findCatalogSiteByName } from "../src/catalog";
import { DEFAULT_SEARCH_SITES } from "../src/catalog/defaults";
import { detectPlatform, platformTarget } from "../src/catalog/platforms";
import type { CheckResult, CheckTarget } from "../src/catalog/types";
import { addCustomApp, findApp, getAppEntries } from "../src/helpers/apps";
import { getHistory } from "../src/helpers/history";
import { openProfile } from "../src/helpers/open-profile";
import { buildSearchEntries, runSearch } from "../src/helpers/search";
import { resetMigrationState } from "../src/helpers/storage";
import { buildAppProfileUrl, completeHandle } from "../src/helpers/url";
import { exportSettingsToYAML, importSettingsFromYAML } from "../src/yaml-settings";

beforeEach(async () => {
  await LocalStorage.clear();
  resetMigrationState();
});

const bluesky = async () => (await findApp("bluesky"))!;

describe("completeHandle", () => {
  it("adds the app's handle domain to a bare name, and leaves a full handle alone", () => {
    expect(completeHandle("bsky.social", "@example")).toBe("example.bsky.social");
    expect(completeHandle("bsky.social", "example.com")).toBe("example.com");
    expect(completeHandle(undefined, "example")).toBe("example");
  });
});

describe("Bluesky", () => {
  it("opens a bare name as a bsky.social handle and records the full handle in History", async () => {
    expect(buildAppProfileUrl(await bluesky(), "example")).toBe("https://bsky.app/profile/example.bsky.social");
    const result = await openProfile("example", "bluesky");
    expect(result.profile).toBe("example.bsky.social");
    expect((await getHistory())[0]).toMatchObject({ profile: "example.bsky.social", app: "bluesky" });
  });

  it("checks the full handle with Slingshot's handle lookup", async () => {
    const asked: string[] = [];
    const check = async (_target: CheckTarget, username: string): Promise<CheckResult> => {
      asked.push(username);
      return { status: "found" };
    };
    const apps = (await getAppEntries()).filter((app) => app.value === "bluesky");
    const entries = buildSearchEntries({ mode: "default", apps, showNsfw: false }).filter((e) => e.key === "bluesky");
    await runSearch(entries, "example", { check, onOutcome: () => undefined });
    expect(asked).toEqual(["example.bsky.social"]);
    expect(appCheck(await bluesky()).target?.check.probeUrl).toContain("slingshot.microcosm.blue");
  });

  it("drops Sherlock's own Bluesky entry, which the built-in app covers", () => {
    expect(catalogSites().some((site) => site.name === "Bluesky")).toBe(false);
  });
});

describe("other ATProto sites", () => {
  it("offers Blacksky, with blacksky.app handles, and searches it by default", () => {
    expect(findCatalogSiteByName("Blacksky")).toMatchObject({
      platform: "atproto",
      handleDomain: "blacksky.app",
      urlTemplate: "https://blacksky.community/profile/{profile}",
    });
    expect(DEFAULT_SEARCH_SITES).toContain("Blacksky");
  });

  it("checks any ATProto site through the public API, and never guesses the platform from a site", async () => {
    expect(platformTarget("atproto", "https://social.example/profile/{profile}").check.probeUrl).toBe(
      "https://slingshot.microcosm.blue/xrpc/com.atproto.identity.resolveHandle?handle={profile}",
    );
    const fetchImpl = (async () => new Response("{}", { status: 200 })) as unknown as typeof fetch;
    expect(await detectPlatform("https://social.example/profile/{profile}", { fetchImpl })).toBeUndefined();
  });

  it("keeps a custom ATProto app's handle domain, through export and import", async () => {
    const app = await addCustomApp({
      name: "Social",
      urlTemplate: "https://social.example/profile/{profile}",
      platform: "atproto",
      handleDomain: "social.example",
    });
    expect(buildAppProfileUrl((await findApp(app.value))!, "example")).toBe(
      "https://social.example/profile/example.social.example",
    );
    const exported = await exportSettingsToYAML();
    await LocalStorage.clear();
    resetMigrationState();
    await importSettingsFromYAML(exported);
    expect((await getAppEntries()).find((entry) => entry.name === "Social")?.handleDomain).toBe("social.example");
  });
});
