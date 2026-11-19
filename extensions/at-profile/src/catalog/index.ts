import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { environment } from "@raycast/api";
import { normalizeUrlTemplate } from "../helpers/url";
import { App } from "../types";
import { appExtras } from "../utils/app-extras";
import { isRecord } from "../utils/is-record";
import { fitsPattern } from "../utils/pattern";
import { isPlatformId, platformTarget } from "./platforms";
import data from "./sherlock.json";
import type { Catalog } from "./sync";
import type { CatalogSite, CheckTarget } from "./types";

/**
 * Sites this extension adds to Sherlock's list. Not probed by the sync: their checks go through a platform.
 */
const EXTRA_SITES: CatalogSite[] = [
  {
    id: "catalog-blacksky",
    name: "Blacksky",
    urlTemplate: "https://blacksky.community/profile/{profile}",
    homepage: "https://blacksky.community",
    knownUsername: "",
    nsfw: false,
    platform: "atproto",
    handleDomain: "blacksky.app",
    check: { signals: ["status"] },
    reliability: "works",
  },
];

const bundled = data as Catalog;
// Update Catalog's copy, built on the user's own connection; the bundled one, from `npm run sync-catalog`, until then
const updatedPath = () => join(environment.supportPath, "catalog.json");

const RELIABILITIES = new Set(["works", "unverified", "unreliable"]);
const SIGNALS = new Set(["status", "message", "redirect"]);
const METHODS = new Set(["GET", "HEAD", "POST", "PUT"]);

const optional = (value: unknown, test: (value: unknown) => boolean) => value === undefined || test(value);
const isString = (value: unknown) => typeof value === "string";
const compiles = (value: unknown) => {
  try {
    return typeof value === "string" && Boolean(new RegExp(value));
  } catch {
    return false;
  }
};
const listOf = (test: (value: unknown) => boolean) => (value: unknown) => Array.isArray(value) && value.every(test);

/** Every field runCheck reads, so a damaged check can't match the wrong text or throw */
function isCheck(check: unknown): boolean {
  return (
    isRecord(check) &&
    Array.isArray(check.signals) &&
    check.signals.length > 0 &&
    check.signals.every((signal) => SIGNALS.has(signal as string)) &&
    optional(check.probeUrl, isString) &&
    optional(check.method, (method) => METHODS.has(method as string)) &&
    optional(check.headers, (headers) => isRecord(headers) && Object.values(headers).every(isString)) &&
    optional(check.body, isString) &&
    optional(check.notFoundText, listOf(isString)) &&
    optional(check.notFoundBody, isString) &&
    optional(check.notFoundStatus, listOf(Number.isInteger))
  );
}

/** Every field a view or a check reads, so one damaged row can't break Import from Catalog or a search */
function isSite(site: unknown): site is CatalogSite {
  if (!isRecord(site) || !isCheck(site.check)) return false;
  return (
    typeof site.id === "string" &&
    typeof site.name === "string" &&
    typeof site.homepage === "string" &&
    typeof site.knownUsername === "string" &&
    typeof site.nsfw === "boolean" &&
    RELIABILITIES.has(site.reliability as string) &&
    (site.urlTemplate === undefined || typeof site.urlTemplate === "string") &&
    optional(site.usernamePattern, compiles) &&
    (site.platform === undefined || isPlatformId(site.platform)) &&
    (site.handleDomain === undefined || typeof site.handleDomain === "string")
  );
}

function readUpdated(): Catalog | undefined {
  try {
    const parsed = JSON.parse(readFileSync(updatedPath(), "utf8")) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.source) || typeof parsed.probedAt !== "string") return undefined;
    const sites = Array.isArray(parsed.sites) ? parsed.sites.filter(isSite) : [];
    // Mostly damaged means the file can't be trusted; a few bad rows are dropped
    if (sites.length === 0 || sites.length < (parsed.sites as unknown[]).length * 0.9) return undefined;
    return { ...(parsed as unknown as Catalog), sites };
  } catch {
    return undefined;
  }
}

interface Loaded {
  catalog: Catalog;
  sites: CatalogSite[];
  updated: boolean;
  byId: Map<string, CatalogSite>;
  byName: Map<string, CatalogSite>;
  byTemplate: Map<string, CatalogSite>;
}
let loaded: Loaded | undefined;

// Read on first use: every command imports the catalog through the app list, and most never look at it
function current(): Loaded {
  return (loaded ??= load());
}

function load(): Loaded {
  const updated = readUpdated();
  const catalog = updated ?? bundled;
  const extraIds = new Set(EXTRA_SITES.map((site) => site.id));
  const sites = [...catalog.sites.filter((site) => !extraIds.has(site.id)), ...EXTRA_SITES];
  return {
    catalog,
    sites,
    updated: Boolean(updated),
    byId: new Map(sites.map((site) => [site.id, site])),
    byName: new Map(sites.map((site) => [site.name, site])),
    byTemplate: new Map(
      sites.filter((site) => site.urlTemplate).map((site) => [normalizeUrlTemplate(site.urlTemplate!), site]),
    ),
  };
}

/** Sherlock's sites, converted and graded, plus this extension's own */
export const catalogSites = () => current().sites;

/** Where the catalog came from, when it was probed, and whether Update Catalog wrote it */
export const catalogSource = () => ({
  ...current().catalog.source,
  probedAt: current().catalog.probedAt,
  updated: current().updated,
});

/**
 * Keep a catalog Update Catalog built, and use it from now on
 */
export function saveCatalog(catalog: Catalog): void {
  // Written beside the file and renamed over it, so a write that fails partway (a full disk) leaves the last good
  // catalog in place instead of a truncated one
  const temporary = `${updatedPath()}.tmp`;
  writeFileSync(temporary, JSON.stringify(catalog));
  renameSync(temporary, updatedPath());
  loaded = load();
}

export function findCatalogSite(id: string): CatalogSite | undefined {
  return current().byId.get(id);
}

export function findCatalogSiteByName(name: string): CatalogSite | undefined {
  return current().byName.get(name);
}

/**
 * A catalog site as an app, for opening a profile on a site that isn't in My Apps
 */
export function catalogApp(site: CatalogSite): App | undefined {
  if (!site.urlTemplate) return undefined;
  return {
    name: site.name,
    value: site.id,
    urlTemplate: site.urlTemplate,
    placeholder: "username",
    ...appExtras(site),
  };
}

/**
 * What to check for a catalog site, or undefined when its check gives wrong answers
 */
export function catalogTarget(
  site: CatalogSite,
  urlTemplate = site.urlTemplate ?? site.homepage,
): CheckTarget | undefined {
  if (site.reliability === "unreliable") return undefined;
  if (site.platform) {
    const target = platformTarget(site.platform, urlTemplate);
    return { ...target, usernamePattern: site.usernamePattern ?? target.usernamePattern };
  }
  return { urlTemplate, check: site.check, usernamePattern: site.usernamePattern };
}

/**
 * How a built-in app is checked. A catalog name borrows that site's check and pattern for the app's own URL
 * template; `check: false` means the app can't be checked, keeping only the pattern. From the catalog probe of
 * 2026-11-08: X's catalog check goes through a Nitter mirror that refuses connections, and Reddit and Threads claim
 * every username exists. Bluesky isn't here: it's checked as an AT Protocol app.
 */
const BUILT_IN: Record<
  string,
  { catalog?: string; target?: Omit<CheckTarget, "urlTemplate">; check?: false; pattern?: string }
> = {
  facebook: { check: false, pattern: "^[A-Za-z0-9.]{5,}$" },
  github: { catalog: "GitHub" },
  instagram: { catalog: "Instagram" },
  // Sherlock's pattern leaves out the hyphens LinkedIn's public profile URLs allow (jane-doe)
  linkedin: { catalog: "LinkedIn", pattern: "^[A-Za-z0-9-]{3,100}$" },
  raycast: { target: { check: { signals: ["status"] } } },
  reddit: { catalog: "Reddit", check: false },
  threads: { check: false, pattern: "^[A-Za-z0-9._]{1,30}$" },
  tiktok: { catalog: "TikTok" },
  x: { catalog: "Twitter", check: false },
  youtube: { target: { check: { signals: ["status"] } } },
  "youtube-brand": { catalog: "YouTube" },
};

export interface AppCheck {
  /** Undefined when the app can't be checked */
  target?: CheckTarget;
  usernamePattern?: string;
}

/**
 * How to check a profile on an app, and which usernames it can have
 */
export function appCheck(app: App): AppCheck {
  const builtIn = BUILT_IN[app.value];
  if (builtIn) {
    const site = builtIn.catalog ? findCatalogSiteByName(builtIn.catalog) : undefined;
    if (builtIn.target) {
      const target = { ...builtIn.target, urlTemplate: app.urlTemplate };
      return { target, usernamePattern: target.usernamePattern };
    }
    const pattern = builtIn.pattern ?? site?.usernamePattern;
    if (builtIn.check === false || !site) return { usernamePattern: pattern };
    const target = catalogTarget(site, app.urlTemplate);
    if (target && builtIn.pattern) target.usernamePattern = builtIn.pattern;
    return { target, usernamePattern: target?.usernamePattern ?? pattern };
  }

  // An added catalog site keeps its ID when its URL is edited, so the ID alone doesn't say which site's check applies:
  // the template must still match
  const normalized = normalizeUrlTemplate(app.urlTemplate);
  const byId = findCatalogSite(app.value);
  const site =
    byId?.urlTemplate && normalizeUrlTemplate(byId.urlTemplate) === normalized
      ? byId
      : current().byTemplate.get(normalized);
  // A site the catalog found giving wrong answers stays Open Only after it's added, platform or not
  if (site?.reliability === "unreliable") return { usernamePattern: site.usernamePattern };

  if (isPlatformId(app.platform)) {
    const target = platformTarget(app.platform, app.urlTemplate);
    return { target, usernamePattern: target.usernamePattern };
  }

  if (site) {
    const target = catalogTarget(site, app.urlTemplate);
    return { target, usernamePattern: target?.usernamePattern ?? site.usernamePattern };
  }
  return {};
}

/**
 * A short reason a username doesn't fit an app's pattern, or undefined when it fits or the app has no pattern
 */
export function usernameWarning(app: App, profile: string): string | undefined {
  const { usernamePattern } = appCheck(app);
  const clean = profile.trim().replace(/^@+/, "");
  if (!usernamePattern || !clean) return undefined;
  return fitsPattern(usernamePattern, clean) ? undefined : `This doesn't look like a ${app.name} username`;
}
