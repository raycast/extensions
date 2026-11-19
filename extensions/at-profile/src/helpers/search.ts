import { getErrorMessage } from "@chrismessina/raycast-kit/errors";
import { appCheck, catalogSites, catalogTarget, findCatalogSiteByName } from "../catalog";
import { BUILT_IN_ALIASES, DEFAULT_SEARCH_SITES, FORMAT_ONLY_SITES } from "../catalog/defaults";
import type { CatalogSite, CheckResult, CheckTarget } from "../catalog/types";
import { AppEntry } from "../types";
import { fitsPattern } from "../utils/pattern";
import { checkProfile } from "./detect";
import { cleanProfile, completeHandle, normalizeUrlTemplate } from "./url";

/** `default`: the user's apps and the default sites. `everywhere`: those and every catalog site that works. */
export type SearchMode = "default" | "everywhere";

/** Sites checked at once. Search Everywhere covers about 300, so it runs more at a time. */
export const SEARCH_CONCURRENCY: Record<SearchMode, number> = { default: 8, everywhere: 16 };

/** `unchecked`: the site has no check, so only opening the profile can tell */
export type SearchOutcome = CheckResult | { status: "unchecked" };

export interface SearchEntry {
  key: string;
  name: string;
  /** The app the profile opens and is recorded in History under. Undefined for a site with no profile URL. */
  appId?: string;
  urlTemplate?: string;
  /** Undefined for a site that can't be checked */
  target?: CheckTarget;
  usernamePattern?: string;
  inMyApps: boolean;
  nsfw: boolean;
  /** Completes a bare name on an ATProto site */
  handleDomain?: string;
}

/**
 * What an entry checks and opens. A finding is only shown again while this is unchanged: editing a custom app's URL
 * or handle domain, or an Update Catalog that changes or drops a site's check, makes its old outcome meaningless.
 */
export function entryIdentity(entry: SearchEntry): string {
  const { urlTemplate, handleDomain, target, usernamePattern } = entry;
  return JSON.stringify([urlTemplate ?? null, handleDomain ?? null, target?.check ?? null, usernamePattern ?? null]);
}

/** entryIdentity for every entry, to save beside the findings */
export const identities = (entries: SearchEntry[]) =>
  Object.fromEntries(entries.map((entry) => [entry.key, entryIdentity(entry)]));

function appEntry(app: AppEntry): SearchEntry {
  const { target, usernamePattern } = appCheck(app);
  return {
    key: app.value,
    name: app.name,
    appId: app.value,
    urlTemplate: app.urlTemplate,
    target,
    usernamePattern,
    inMyApps: true,
    nsfw: app.nsfw === true,
    handleDomain: app.handleDomain,
  };
}

function siteEntry(site: CatalogSite): SearchEntry {
  const target = catalogTarget(site);
  return {
    key: site.id,
    name: site.name,
    appId: site.urlTemplate ? site.id : undefined,
    urlTemplate: site.urlTemplate,
    target,
    usernamePattern: target?.usernamePattern ?? site.usernamePattern,
    inMyApps: false,
    nsfw: site.nsfw,
    handleDomain: site.handleDomain,
  };
}

/**
 * The sites to check, each once. An app wins over the catalog site that opens the same profile URLs.
 */
export function buildSearchEntries(options: { mode: SearchMode; apps: AppEntry[]; showNsfw: boolean }): SearchEntry[] {
  const { mode, apps, showNsfw } = options;
  const entries: SearchEntry[] = [];
  const seenKeys = new Set<string>();
  const seenTemplates = new Set<string>();
  const add = (entry: SearchEntry) => {
    const template = entry.urlTemplate ? normalizeUrlTemplate(entry.urlTemplate) : undefined;
    if (seenKeys.has(entry.key) || (template && seenTemplates.has(template))) return;
    seenKeys.add(entry.key);
    if (template) seenTemplates.add(template);
    entries.push(entry);
  };

  const appsById = new Map(apps.map((app) => [app.value, app]));
  // An app marked NSFW is left out like an NSFW catalog site
  const wanted = (app: AppEntry) => showNsfw || !app.nsfw;
  apps.filter((app) => app.visible && wanted(app)).forEach((app) => add(appEntry(app)));
  // An app left out as NSFW keeps out the catalog site that opens the same profiles, under either ID
  apps
    .filter((app) => !wanted(app))
    .forEach((app) => {
      seenKeys.add(app.value);
      seenTemplates.add(normalizeUrlTemplate(app.urlTemplate));
    });

  for (const name of DEFAULT_SEARCH_SITES) {
    const alias = appsById.get(BUILT_IN_ALIASES[name]);
    if (alias) {
      if (wanted(alias)) add(appEntry(alias));
      continue;
    }
    const site = findCatalogSiteByName(name);
    if (site) add(siteEntry(site));
  }
  for (const site of FORMAT_ONLY_SITES) {
    add({ key: site.key, name: site.name, usernamePattern: site.usernamePattern, inMyApps: false, nsfw: false });
  }

  if (mode === "everywhere") {
    catalogSites()
      .filter((site) => site.reliability === "works" && (showNsfw || !site.nsfw))
      .forEach((site) => add(siteEntry(site)));
  }
  return entries;
}

type Check = (target: CheckTarget, username: string, options: { signal?: AbortSignal }) => Promise<CheckResult>;

/**
 * Check a username on every entry, `concurrency` sites at a time. Entries that need no request are reported first.
 * Once `signal` cancels, nothing more is reported.
 */
export async function runSearch(
  entries: SearchEntry[],
  username: string,
  options: {
    concurrency?: number;
    signal?: AbortSignal;
    check?: Check;
    onOutcome: (key: string, outcome: SearchOutcome) => void;
  },
): Promise<void> {
  const { concurrency = 8, signal, check = checkProfile, onOutcome } = options;
  const profile = cleanProfile(username);
  const report = (key: string, outcome: SearchOutcome) => {
    if (!signal?.aborted) onOutcome(key, outcome);
  };

  const queue: SearchEntry[] = [];
  const profileOn = (entry: SearchEntry) => completeHandle(entry.handleDomain, profile);
  for (const entry of entries) {
    if (entry.usernamePattern && !fitsPattern(entry.usernamePattern, profileOn(entry))) {
      report(entry.key, { status: "invalid" });
    } else if (!entry.target) {
      report(entry.key, { status: "unchecked" });
    } else {
      queue.push(entry);
    }
  }

  let next = 0;
  const worker = async () => {
    while (next < queue.length && !signal?.aborted) {
      const entry = queue[next++];
      try {
        report(entry.key, await check(entry.target!, profileOn(entry), { signal }));
      } catch (error) {
        report(entry.key, { status: "error", error: getErrorMessage(error) });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
}
