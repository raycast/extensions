import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorage } from "@raycast/api";
import { appCheck, findCatalogSite } from "../src/catalog";
import { detectPlatform } from "../src/catalog/platforms";
import { addCatalogApp, findApp, getAppEntries, setAppVisibility, updateCustomApp } from "../src/helpers/apps";
import { checkProfile } from "../src/helpers/detect";
import { FIND_PROFILE_APP_ID, readFindings, saveFindings } from "../src/helpers/findings";
import {
  getHistory,
  getHistoryPairKey,
  getStarredHistory,
  recordProfileOpen,
  setHistoryItemStarred,
} from "../src/helpers/history";
import { buildSearchEntries, entryIdentity, SearchEntry } from "../src/helpers/search";
import { resetMigrationState } from "../src/helpers/storage";
import getProfileHistory from "../src/tools/history";
import openTool from "../src/tools/open";
import { importSettingsFromYAML } from "../src/yaml-settings";

beforeEach(async () => {
  await LocalStorage.clear();
  resetMigrationState();
});

describe("a check that reads the page", () => {
  // Discord answers a username it won't accept with a 400 that holds none of its "not taken" text
  it("can't tell from a client error, so it says the check failed rather than found", async () => {
    const fetchImpl = (async () => new Response('{"message":"Invalid Form Body"}', { status: 400 })) as typeof fetch;
    const result = await checkProfile(
      {
        urlTemplate: "https://chat.example/{profile}",
        check: { signals: ["message"], notFoundText: ['"taken":false'] },
      },
      "a",
      { fetchImpl },
    );
    expect(result.status).toBe("error");
  });
});

describe("an Open Only catalog site", () => {
  it("stays unchecked after it's added to My Apps, even when it runs a known platform", async () => {
    const site = findCatalogSite("catalog-mstdn-io")!;
    expect(site).toMatchObject({ platform: "mastodon", reliability: "unreliable" });
    await addCatalogApp(site);
    const app = (await findApp(site.id))!;
    expect(app.platform).toBe("mastodon");
    expect(appCheck(app).target).toBeUndefined();
  });
});

describe("LinkedIn", () => {
  it("accepts a hyphenated public profile name", async () => {
    const { usernamePattern } = appCheck((await findApp("linkedin"))!);
    expect(new RegExp(usernamePattern!).test("jane-doe")).toBe(true);
  });
});

describe("a saved catalog with a damaged row", () => {
  it("drops the row instead of handing it to Import from Catalog", async () => {
    const good = (index: number) => ({
      id: `catalog-site-${index}`,
      name: `Site ${index}`,
      urlTemplate: `https://site${index}.example/{profile}`,
      homepage: `https://site${index}.example`,
      knownUsername: "example_user",
      nsfw: false,
      check: { signals: ["status"] },
      reliability: "works",
    });
    const rows: unknown[] = Array.from({ length: 20 }, (_, index) => good(index));
    const damaged: Record<string, unknown> = { ...good(99) };
    delete damaged.reliability;
    rows.push(damaged);
    // A check whose not-found text is damaged would match "null" instead of the real marker
    rows.push({ ...good(98), check: { signals: ["message"], notFoundText: [null] } });
    // Resetting modules gives the @raycast/api stub a new support directory; the file goes into that one
    vi.resetModules();
    const { environment: fresh } = await import("@raycast/api");
    writeFileSync(
      join(fresh.supportPath, "catalog.json"),
      JSON.stringify({ source: {}, probedAt: "2026-11-09", sites: rows }),
    );
    const catalog = await import("../src/catalog");
    expect(catalog.catalogSource().updated).toBe(true);
    expect(catalog.findCatalogSite("catalog-site-99")).toBeUndefined();
    expect(catalog.findCatalogSite("catalog-site-98")).toBeUndefined();
    expect(catalog.catalogSites().every((site) => site.reliability)).toBe(true);
  });
});

describe("saved findings", () => {
  it("belong to what was checked: a custom app's new URL or handle domain doesn't inherit them", () => {
    const entry: SearchEntry = {
      key: "social-example",
      name: "Social",
      urlTemplate: "https://social.example/@{profile}",
      inMyApps: true,
      nsfw: false,
    };
    expect(entryIdentity({ ...entry, urlTemplate: "https://other.example/@{profile}" })).not.toBe(entryIdentity(entry));
    expect(entryIdentity({ ...entry, handleDomain: "social.example" })).not.toBe(entryIdentity(entry));
    expect(entryIdentity({ ...entry })).toBe(entryIdentity(entry));
    // Update Catalog regrading a site Open Only drops its check; changing its check or pattern counts too
    const checked = { ...entry, target: { urlTemplate: entry.urlTemplate!, check: { signals: ["status" as const] } } };
    expect(entryIdentity(entry)).not.toBe(entryIdentity(checked));
    expect(
      entryIdentity({ ...checked, target: { ...checked.target, check: { signals: ["message" as const] } } }),
    ).not.toBe(entryIdentity(checked));
    expect(entryIdentity({ ...checked, usernamePattern: "^[a-z]+$" })).not.toBe(entryIdentity(checked));
  });
});

describe("YAML import", () => {
  it("restores History rows for searches and for profiles opened on a catalog site", async () => {
    const summary = await importSettingsFromYAML(`version: "1.0"
visible: {}
customApps: []
usageHistory:
  - { profile: example_user, app: ${FIND_PROFILE_APP_ID}, appName: Find Profile, timestamp: 1700000000000, count: 2 }
  - { profile: example_user, app: catalog-blacksky, appName: Blacksky, timestamp: 1700000000100, count: 1 }
`);
    expect(summary.historySkipped).toBe(0);
    const apps = (await getHistory()).map((item) => item.app).sort();
    expect(apps).toEqual(["catalog-blacksky", FIND_PROFILE_APP_ID].sort());
  });
});

describe("the History AI tool", () => {
  it("removes a Bluesky favorite named by its bare name", async () => {
    await recordProfileOpen("example.bsky.social", "bluesky", "Bluesky");
    await setHistoryItemStarred("example.bsky.social", "bluesky", true);
    const answer = await getProfileHistory({ action: "unstar", profile: "example", app: "bluesky" });
    expect(answer).toContain("Removed");
    expect(await getStarredHistory()).toHaveLength(0);
  });

  it("doesn't let a favorite search take the place of a favorite profile in a limited list", async () => {
    await recordProfileOpen("example_user", "github", "GitHub");
    await setHistoryItemStarred("example_user", "github", true);
    await recordProfileOpen("example_user", FIND_PROFILE_APP_ID, "Find Profile");
    await setHistoryItemStarred("example_user", FIND_PROFILE_APP_ID, true);
    const answer = await getProfileHistory({ action: "list_starred", limit: 1 });
    expect(answer).toContain("GitHub");
  });
});

describe("round 3", () => {
  it("checks an edited catalog app against its new URL, not the catalog site it came from", async () => {
    const medium = findCatalogSite("catalog-medium")!;
    await addCatalogApp(medium);
    await updateCustomApp(medium.id, { name: "Other", urlTemplate: "https://other.example/u/{profile}" });
    const { target } = appCheck((await findApp(medium.id))!);
    expect(target?.check.probeUrl ?? "").not.toContain("medium.com");
  });

  it("restores a catalog app from YAML under its catalog ID", async () => {
    const medium = findCatalogSite("catalog-medium")!;
    await importSettingsFromYAML(`version: "1.0"
visible: {}
usageHistory: []
customApps:
  - { name: Medium, value: ${medium.id}, urlTemplate: "${medium.urlTemplate}", visible: true }
`);
    expect((await getAppEntries()).some((app) => app.value === medium.id)).toBe(true);
  });

  it("keeps the catalog twin of an app marked NSFW out of the search", async () => {
    const medium = findCatalogSite("catalog-medium")!;
    await addCatalogApp(medium);
    await updateCustomApp(medium.id, { name: "Medium", urlTemplate: medium.urlTemplate!, nsfw: true });
    const entries = buildSearchEntries({ mode: "everywhere", apps: await getAppEntries(), showNsfw: false });
    expect(entries.some((entry) => entry.name === "Medium")).toBe(false);
  });

  it("drops a saved catalog row whose username pattern doesn't compile", async () => {
    const row = (index: number, usernamePattern?: string) => ({
      id: `catalog-site-${index}`,
      name: `Site ${index}`,
      urlTemplate: `https://site${index}.example/{profile}`,
      homepage: `https://site${index}.example`,
      knownUsername: "example_user",
      nsfw: false,
      check: { signals: ["status"] },
      reliability: "works",
      ...(usernamePattern ? { usernamePattern } : {}),
    });
    const rows = [...Array.from({ length: 20 }, (_, index) => row(index)), row(99, "[")];
    vi.resetModules();
    const { environment: fresh } = await import("@raycast/api");
    writeFileSync(join(fresh.supportPath, "catalog.json"), JSON.stringify({ source: {}, probedAt: "x", sites: rows }));
    const catalog = await import("../src/catalog");
    expect(catalog.catalogSource().updated).toBe(true);
    expect(catalog.findCatalogSite("catalog-site-99")).toBeUndefined();
  });

  it("lets the AI open a profile Find Profiles found on a site that isn't in My Apps", async () => {
    await expect(openTool({ profile: "example_user", app: "Medium" })).resolves.toContain("Medium");
  });

  it("doesn't let an older search replace a newer one's findings", () => {
    const findings = (startedAt: number, found: boolean) => ({
      profile: "example_user",
      mode: "default" as const,
      finishedAt: startedAt + 1000,
      durationMs: 1000,
      total: 1,
      canceled: false,
      outcomes: { github: { status: found ? ("found" as const) : ("not-found" as const) } },
    });
    saveFindings(findings(2_000_000, true));
    saveFindings(findings(1_000_000, false));
    expect(readFindings("example_user")?.outcomes.github.status).toBe("found");
  });
});

describe("round 4", () => {
  it("tells a site that didn't answer apart from one that runs no known platform", async () => {
    const offline = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(detectPlatform("https://social.example/@{profile}", { fetchImpl: offline })).rejects.toThrow(
      "social.example",
    );
    const answers = (async () => new Response("{}", { status: 200 })) as typeof fetch;
    await expect(detectPlatform("https://social.example/@{profile}", { fetchImpl: answers })).resolves.toBeUndefined();
  });

  it("opens a found profile through the app the user renamed, and not through one they hid", async () => {
    const medium = findCatalogSite("catalog-medium")!;
    await addCatalogApp(medium);
    await updateCustomApp(medium.id, { name: "Writing", urlTemplate: medium.urlTemplate! });
    await expect(openTool({ profile: "example_user", app: "Medium" })).resolves.toContain("Writing");
    await setAppVisibility(medium.id, false);
    await expect(openTool({ profile: "example_user", app: "Medium" })).rejects.toThrow();
  });

  it("keeps the last good catalog when writing a new one fails partway", async () => {
    vi.resetModules();
    const { environment: fresh } = await import("@raycast/api");
    const catalog = await import("../src/catalog");
    const file = join(fresh.supportPath, "catalog.json");
    const good = { source: { repository: "x", commit: "a", license: "MIT" }, probedAt: "2026-11-09", sites: [] };
    writeFileSync(file, JSON.stringify(good));
    // A directory where the temporary file goes makes the write fail, as a full disk would
    mkdirSync(`${file}.tmp`);
    expect(() => catalog.saveCatalog({ ...good, probedAt: "2026-11-10" })).toThrow();
    expect(JSON.parse(readFileSync(file, "utf8")).probedAt).toBe("2026-11-09");
  });
});

describe("round 5", () => {
  it("merges Bluesky History saved before bare names were completed", async () => {
    await LocalStorage.setItem(
      "usageHistory",
      JSON.stringify([{ profile: "example", app: "bluesky", appName: "Bluesky", timestamp: 1700000000000, count: 2 }]),
    );
    await LocalStorage.setItem("starredHistoryItems", JSON.stringify([getHistoryPairKey("example", "bluesky")]));
    await LocalStorage.setItem("schemaVersion", "2");
    await recordProfileOpen("example.bsky.social", "bluesky", "Bluesky");
    const rows = (await getHistory()).filter((item) => item.app === "bluesky");
    expect(rows).toEqual([expect.objectContaining({ profile: "example.bsky.social", count: 3 })]);
    expect((await getStarredHistory()).map((item) => item.profile)).toEqual(["example.bsky.social"]);
  });

  it("completes a bare Bluesky name in an older YAML export", async () => {
    await importSettingsFromYAML(`version: "1.0"
visible: {}
customApps: []
usageHistory:
  - { profile: example, app: bluesky, appName: Bluesky, timestamp: 1700000000000, count: 1 }
`);
    expect((await getHistory()).map((item) => item.profile)).toEqual(["example.bsky.social"]);
  });

  it("doesn't read a refused request or a regional block page as no profile", async () => {
    const respond = (status: number, body = "") => (async () => new Response(body, { status })) as typeof fetch;
    const statusCheck = { urlTemplate: "https://site.example/{profile}", check: { signals: ["status" as const] } };
    expect((await checkProfile(statusCheck, "example_user", { fetchImpl: respond(405) })).status).toBe("error");
    const tiktok = {
      urlTemplate: "https://site.example/@{profile}",
      check: { signals: ["message" as const], notFoundText: ["Govt. of India decided to block 59 apps"] },
    };
    const blockPage = respond(200, "<p>Govt. of India decided to block 59 apps</p>");
    expect((await checkProfile(tiktok, "example_user", { fetchImpl: blockPage })).status).toBe("blocked");
  });
});

describe("round 6", () => {
  it("keeps a stored app's cleared handle domain when importing its History", async () => {
    const blacksky = findCatalogSite("catalog-blacksky")!;
    await addCatalogApp(blacksky);
    await updateCustomApp(blacksky.id, { name: "Other", urlTemplate: "https://other.example/u/{profile}" });
    await importSettingsFromYAML(`version: "1.0"
visible: {}
customApps: []
usageHistory:
  - { profile: example, app: ${blacksky.id}, appName: Other, timestamp: 1700000000000, count: 1 }
`);
    expect((await getHistory()).map((item) => item.profile)).toEqual(["example"]);
  });
});
