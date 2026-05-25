import * as path from "path";
import { scanInstalledApps } from "./bundle-scanner";
import { InstalledApp, UpdateInfo, CliPackage } from "./types";
import {
  checkHomebrewCask,
  findCaskFor,
  getAllInstalledFormulae,
  getBrewAppMap,
  getCaskIndex,
  getInstalledCaskTokens,
  getOutdatedFormulae,
} from "./sources/homebrew";
import { checkAppStore } from "./sources/mas";
import { checkSparkle } from "./sources/sparkle";
import { checkElectron } from "./sources/electron";
import { checkGitHub } from "./sources/github";
import {
  getAllInstalledGems,
  getAllInstalledNpm,
  getAllInstalledPip,
  getOutdatedGems,
  getOutdatedNpm,
  getOutdatedPip,
} from "./sources/cli-managers";
import { getKnownInstall } from "./known-installs";
import { getIgnoredBundles } from "./ignored";
import { refreshUserKnownInstallsCache } from "./user-known-installs";
import { refreshUserSparkleFeedsCache } from "./user-sparkle-feeds";

export interface ScanResult {
  apps: UpdateInfo[];
  unmanaged: InstalledApp[];
  /** Bundle IDs the user has explicitly hidden from update suggestions. Already filtered out
   *  of `apps`/`unmanaged` above; exposed here so the UI can render a "Hidden" view. */
  ignoredApps: InstalledApp[];
  cliPackages: CliPackage[]; // outdated only
  allInstalledPackages: CliPackage[]; // every installed package across all sources
  scannedAt: number;
}

async function checkAppAcrossSources(
  app: InstalledApp,
  caskIndex: Awaited<ReturnType<typeof getCaskIndex>>,
): Promise<UpdateInfo | null> {
  // 1. If currently installed via Homebrew, it is the canonical source
  if (app.managedByBrew && app.suggestedCask) {
    const cask = await checkHomebrewCask(app, caskIndex);
    if (cask) return cask;
  }

  // 2. App Store (definitive for MAS apps)
  if (app.hasAppStoreReceipt) {
    const mas = await checkAppStore(app);
    if (mas) return mas;
  }

  // 3. Sparkle (huge swath of Mac apps)
  if (app.sparkleFeedUrl) {
    const sparkle = await checkSparkle(app);
    if (sparkle) return sparkle;
  }

  // 4. Electron app or known endpoint
  const electron = await checkElectron(app);
  if (electron) return electron;

  // 5. GitHub fallback (via SUFeedURL hint)
  const gh = await checkGitHub(app);
  if (gh) return gh;

  // NOTE: deliberately no "suggest brew" fallback here.
  // Apps with a cask suggestion but no brew install can't actually be updated
  // via `brew upgrade` — they have to be ADOPTED first. They fall through to
  // unmanaged, where the adoption flow surfaces them with the right action.
  return null;
}

export async function scanAll(): Promise<ScanResult> {
  // Preload user-defined caches so synchronous lookups below pick them up.
  await Promise.all([
    refreshUserKnownInstallsCache(),
    refreshUserSparkleFeedsCache(),
  ]);

  const [
    rawApps,
    caskIndex,
    managedCasks,
    brewAppMap,
    allFormulae,
    allNpm,
    allPip,
    allGem,
    npm,
    pip,
    gem,
    outdatedFormulae,
    ignoredSet,
  ] = await Promise.all([
    scanInstalledApps(),
    getCaskIndex().catch(() => ({
      byBundleId: new Map(),
      byName: new Map(),
      byToken: new Map(),
      fetchedAt: Date.now(),
    })),
    getInstalledCaskTokens(),
    getBrewAppMap(),
    getAllInstalledFormulae(),
    getAllInstalledNpm(),
    getAllInstalledPip(),
    getAllInstalledGems(),
    getOutdatedNpm(),
    getOutdatedPip(),
    getOutdatedGems(),
    getOutdatedFormulae(),
    getIgnoredBundles(),
  ]);

  // Decorate every app with cask suggestion + managed status.
  // Authoritative source for managedByBrew: Caskroom contents (filesystem).
  // Fall back to fuzzy cask matching for *suggestion* when not currently managed.
  const apps: InstalledApp[] = rawApps.map((a) => {
    const appFileName = path.basename(a.appPath);
    const directToken = brewAppMap.get(appFileName); // definitive token if installed via brew
    const fuzzyMatch = findCaskFor(a, caskIndex); // best-effort match for adoption
    let suggestedCask = directToken ?? fuzzyMatch?.token;
    const managedByBrew =
      !!directToken ||
      (fuzzyMatch ? managedCasks.has(fuzzyMatch.token) : false);

    // Don't suggest brew adoption for MAS apps — the brew cask is rarely equivalent
    // to the MAS build and adoption almost always fails (Canva, Hidden Bar, etc.)
    if (a.hasAppStoreReceipt && !managedByBrew) {
      suggestedCask = undefined;
    }

    // Curated registry — KDE Connect via third-party tap, Blackmagic via MAS, etc.
    const known = getKnownInstall(a.bundleId);
    let knownInstallKind: InstalledApp["knownInstallKind"];
    let knownInstallDescription: string | undefined;
    if (known && !managedByBrew) {
      knownInstallKind = known.kind;
      knownInstallDescription = known.description;
      // For brew-tap entries, surface the full token so adoption flows work
      if (known.kind === "brew-tap" && known.caskToken && !suggestedCask) {
        suggestedCask = known.caskToken;
      }
    }

    return {
      ...a,
      suggestedCask,
      managedByBrew,
      knownInstallKind,
      knownInstallDescription,
    };
  });

  // Split off ignored apps before running expensive source checks — no point
  // computing update info for things the user explicitly muted.
  const ignoredApps: InstalledApp[] = [];
  const activeApps: InstalledApp[] = [];
  for (const a of apps) {
    if (ignoredSet.has(a.bundleId)) ignoredApps.push(a);
    else activeApps.push(a);
  }

  // Run source checks with bounded concurrency
  const results: (UpdateInfo | null)[] = [];
  const unmanaged: InstalledApp[] = [];
  // 4 concurrent source checks is a good balance — high enough to hide network
  // latency, low enough to keep peak memory + parallel HTTP fetches sane within
  // Raycast's 100MB per-command JS heap budget.
  const CONCURRENCY = 4;
  for (let i = 0; i < activeApps.length; i += CONCURRENCY) {
    const slice = activeApps.slice(i, i + CONCURRENCY);
    const batch = await Promise.all(
      slice.map((app) =>
        checkAppAcrossSources(app, caskIndex).catch(() => null),
      ),
    );
    for (let j = 0; j < batch.length; j++) {
      if (batch[j]) results.push(batch[j]);
      else unmanaged.push(slice[j]);
    }
  }

  const cliPackages: CliPackage[] = [
    ...outdatedFormulae,
    ...npm,
    ...pip,
    ...gem,
  ];

  // Build an inventory of every installed package across all sources (outdated info merged in).
  const outdatedByKey = new Map<string, CliPackage>();
  for (const p of cliPackages) outdatedByKey.set(`${p.source}:${p.name}`, p);

  const allInstalledPackages: CliPackage[] = [];
  const mergeInstall = (
    source: CliPackage["source"],
    installed: { name: string; installedVersion: string },
  ) => {
    const key = `${source}:${installed.name}`;
    const outdated = outdatedByKey.get(key);
    allInstalledPackages.push({
      id: installed.name,
      name: installed.name,
      currentVersion: installed.installedVersion,
      latestVersion: outdated?.latestVersion ?? installed.installedVersion,
      source,
    });
  };
  for (const f of allFormulae) mergeInstall("homebrew-formula", f);
  for (const n of allNpm) mergeInstall("npm", n);
  for (const p of allPip) mergeInstall("pip", p);
  for (const g of allGem) mergeInstall("gem", g);

  return {
    apps: results.filter((r): r is UpdateInfo => r !== null),
    unmanaged,
    ignoredApps,
    cliPackages,
    allInstalledPackages,
    scannedAt: Date.now(),
  };
}
