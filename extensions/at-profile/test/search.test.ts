import { describe, expect, it } from "vitest";
import { catalogSites } from "../src/catalog";
import type { CheckResult, CheckTarget } from "../src/catalog/types";
import { buildSearchEntries, runSearch, SearchEntry, SearchOutcome } from "../src/helpers/search";
import { normalizeUrlTemplate } from "../src/helpers/url";
import { AppEntry } from "../src/types";
import { defaultApps } from "../src/utils/default-apps";

const builtIns = (hidden: string[] = []): AppEntry[] =>
  defaultApps.map((app) => ({ ...app, isDefault: true, visible: !hidden.includes(app.value) }));

const custom = (app: Partial<AppEntry> & Pick<AppEntry, "name" | "value" | "urlTemplate">): AppEntry => ({
  placeholder: "username",
  isDefault: false,
  visible: true,
  ...app,
});

describe("buildSearchEntries", () => {
  it("checks every shown app plus the default sites, once each", () => {
    const entries = buildSearchEntries({ mode: "default", apps: builtIns(), showNsfw: false });
    const keys = entries.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    // GitHub is a built-in and a default site: it appears once, as the built-in app
    expect(entries.filter((entry) => entry.name === "GitHub")).toHaveLength(1);
    expect(entries.find((entry) => entry.name === "GitHub")).toMatchObject({ appId: "github", inMyApps: true });
    expect(entries.find((entry) => entry.name === "Medium")).toMatchObject({
      appId: "catalog-medium",
      inMyApps: false,
    });
    const signal = entries.find((entry) => entry.name === "Signal");
    expect(signal?.usernamePattern).toBeDefined();
    expect(signal?.appId).toBeUndefined();
    expect(signal?.target).toBeUndefined();
  });

  it("leaves out a hidden app, unless it is a default site", () => {
    const entries = buildSearchEntries({ mode: "default", apps: builtIns(["x", "instagram"]), showNsfw: false });
    expect(entries.some((entry) => entry.appId === "x")).toBe(false);
    expect(entries.some((entry) => entry.appId === "instagram")).toBe(true);
  });

  it("merges a custom app with the catalog site that opens the same URLs", () => {
    const apps = [
      ...builtIns(),
      custom({ name: "My Medium", value: "medium-com", urlTemplate: "https://medium.com/@{profile}" }),
    ];
    const entries = buildSearchEntries({ mode: "default", apps, showNsfw: false });
    expect(entries.filter((entry) => entry.urlTemplate === "https://medium.com/@{profile}")).toHaveLength(1);
    expect(entries.find((entry) => entry.urlTemplate === "https://medium.com/@{profile}")).toMatchObject({
      name: "My Medium",
      appId: "medium-com",
    });
  });

  it("leaves out an app marked NSFW unless NSFW sites are included", () => {
    const apps = [
      ...builtIns(),
      custom({ name: "Adult", value: "adult", urlTemplate: "https://adult.example/{profile}", nsfw: true }),
    ];
    expect(buildSearchEntries({ mode: "default", apps, showNsfw: false }).some((e) => e.key === "adult")).toBe(false);
    expect(buildSearchEntries({ mode: "default", apps, showNsfw: true }).find((e) => e.key === "adult")?.nsfw).toBe(
      true,
    );
  });

  it("searches every working catalog site everywhere, and NSFW sites only when they are shown", () => {
    const sfw = buildSearchEntries({ mode: "everywhere", apps: builtIns(), showNsfw: false });
    const all = buildSearchEntries({ mode: "everywhere", apps: builtIns(), showNsfw: true });
    const working = catalogSites().filter((site) => site.reliability === "works");
    // Each one is searched, as itself or as the app that opens the same profile URLs
    const searched = new Set(
      sfw.flatMap((entry) => [entry.key, entry.urlTemplate && normalizeUrlTemplate(entry.urlTemplate)]),
    );
    const missing = working.filter(
      (site) =>
        !site.nsfw &&
        !searched.has(site.id) &&
        !(site.urlTemplate && searched.has(normalizeUrlTemplate(site.urlTemplate))),
    );
    expect(missing.map((site) => site.name)).toEqual([]);
    expect(sfw.some((entry) => entry.nsfw)).toBe(false);
    const workingNsfw = working.filter((site) => site.nsfw);
    expect(all.filter((entry) => entry.nsfw)).toHaveLength(workingNsfw.length);
    // A site whose check gives wrong answers is never searched
    const unreliable = catalogSites().find((site) => site.reliability === "unreliable" && !site.nsfw)!;
    expect(all.some((entry) => entry.appId === unreliable.id && entry.target)).toBe(false);
  });
});

const entry = (key: string, target?: Partial<CheckTarget>, usernamePattern?: string): SearchEntry => ({
  key,
  name: key,
  appId: key,
  urlTemplate: `https://${key}.example/{profile}`,
  target: target
    ? { urlTemplate: `https://${key}.example/{profile}`, check: { signals: ["status"] }, ...target }
    : undefined,
  usernamePattern,
  inMyApps: false,
  nsfw: false,
});

describe("runSearch", () => {
  it("checks at most `concurrency` sites at a time and reports each one", async () => {
    let running = 0;
    let peak = 0;
    const check = async (): Promise<CheckResult> => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      return { status: "found" };
    };
    const outcomes = new Map<string, SearchOutcome>();
    const entries = Array.from({ length: 10 }, (_, index) => entry(`site${index}`, {}));
    await runSearch(entries, "example_user", {
      concurrency: 3,
      check,
      onOutcome: (key, outcome) => outcomes.set(key, outcome),
    });
    expect(peak).toBe(3);
    expect(outcomes.size).toBe(10);
  });

  it("reports a site it can't check, and a username that doesn't fit, without a request", async () => {
    let requests = 0;
    const check = async (): Promise<CheckResult> => {
      requests++;
      return { status: "found" };
    };
    const outcomes = new Map<string, SearchOutcome>();
    await runSearch([entry("plain"), entry("strict", undefined, "^[0-9]+$")], "example_user", {
      check,
      onOutcome: (key, outcome) => outcomes.set(key, outcome),
    });
    expect(requests).toBe(0);
    expect(outcomes.get("plain")).toEqual({ status: "unchecked" });
    expect(outcomes.get("strict")).toEqual({ status: "invalid" });
  });

  it("stops starting checks once canceled, and reports nothing after", async () => {
    const controller = new AbortController();
    const outcomes: string[] = [];
    let started = 0;
    // The first check cancels the search while it runs, with no timers to race
    const check = async (_target: CheckTarget, _username: string, options: { signal?: AbortSignal }) => {
      started++;
      await Promise.resolve();
      controller.abort();
      options.signal?.throwIfAborted();
      return { status: "found" } as CheckResult;
    };
    const entries = Array.from({ length: 6 }, (_, index) => entry(`site${index}`, {}));
    const pending = runSearch(entries, "example_user", {
      concurrency: 2,
      check,
      signal: controller.signal,
      onOutcome: (key) => outcomes.push(key),
    });
    await pending;
    expect(outcomes).toHaveLength(0);
    // Only the checks already running when it was canceled
    expect(started).toBe(2);
  });

  it("turns a check that throws into an error outcome", async () => {
    const outcomes = new Map<string, SearchOutcome>();
    await runSearch([entry("broken", {})], "example_user", {
      check: async () => {
        throw new Error("boom");
      },
      onOutcome: (key, outcome) => outcomes.set(key, outcome),
    });
    expect(outcomes.get("broken")).toEqual({ status: "error", error: "boom" });
  });
});
