import { readdir, stat } from "fs/promises";
import { join } from "path";
import type { InstalledApp } from "./apps";
import { findCaskToken, findPackageReceipts, findVendorUninstaller, isAppRunning } from "./apps";
import { processesUsing, type Holder } from "./inuse";
import { SEARCH_ROOTS, type SearchRoot } from "./locations";
import { attribute, buildMatcher, classify, CONFIDENCE_RANK, type Confidence, type Matcher } from "./match";
import { checkRemovable } from "./safety";
import { measurePaths } from "./size";

export interface Leftover {
  path: string;
  /** What kind of data this is, e.g. "Sandbox Container". */
  label: string;
  scope: "user" | "system";
  confidence: Confidence;
  reason: string;
  /** Size in bytes; 0 when it could not be measured. */
  size: number;
  needsAdmin: boolean;
}

export interface ScanResult {
  app: InstalledApp;
  bundle: Leftover | null;
  leftovers: Leftover[];
  isRunning: boolean;
  /** Processes holding files open inside the bundle, which blocks its removal. */
  bundleInUseBy: Holder[];
  /** Set when `brew uninstall --cask --zap` is the better tool for this app. */
  caskToken: string | null;
  /** Set when the vendor ships its own uninstaller that should be used instead. */
  vendorUninstaller: string | null;
  /** Installer receipts that only `sudo pkgutil --forget` can clear. */
  packageReceipts: string[];
}

/** Collect candidate paths under one search root, without descending into hits. */
async function scanRoot(root: SearchRoot, target: Matcher, others: Matcher[]): Promise<Leftover[]> {
  const found: Leftover[] = [];

  function belongsToAnotherApp(name: string): boolean {
    return others.some(
      (other) =>
        other.app.path !== target.app.path &&
        CONFIDENCE_RANK[classify(name, other)?.confidence ?? "low"] >= CONFIDENCE_RANK.medium,
    );
  }

  async function walk(dir: string, depth: number) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const path = join(dir, entry.name);
      const attribution = attribute(entry.name, target, others);

      // Deeper entries need stronger evidence: a passing name resemblance two
      // levels down is far more likely to be another app's file than ours.
      if (attribution && depth > 1 && attribution.match.confidence === "low") {
        continue;
      }

      if (attribution) {
        let safe;
        try {
          safe = checkRemovable(path);
        } catch {
          // The guard rejected it; a rejected path is never offered to the user.
          continue;
        }
        found.push({
          path,
          label: root.label,
          scope: root.scope,
          confidence: attribution.match.confidence,
          reason: attribution.match.reason,
          size: 0,
          needsAdmin: safe.needsAdmin,
        });
        // A matched directory is removed whole; its children are already covered.
        continue;
      }

      // Descending into a folder that clearly belongs to a different app finds
      // only that app's files. `Slack/VideoDecodeStats` is Slack's, however much
      // it looks like it mentions the Stats app.
      if (depth < root.depth && entry.isDirectory() && !entry.isSymbolicLink() && !belongsToAnotherApp(entry.name)) {
        await walk(path, depth + 1);
      }
    }
  }

  await walk(root.path, 1);
  return found;
}

async function describeBundle(app: InstalledApp): Promise<Leftover | null> {
  try {
    const safe = checkRemovable(app.path);
    const info = await stat(app.path);
    return {
      path: app.path,
      label: "Application",
      scope: app.path.startsWith("/Applications") ? "system" : "user",
      confidence: "high",
      reason: "The application bundle",
      size: info.size,
      needsAdmin: safe.needsAdmin,
    };
  } catch {
    return null;
  }
}

/**
 * Find everything on disk that belongs to `app`.
 *
 * `allApps` is required: attribution compares every candidate against all other
 * installed applications so that shared files are flagged rather than deleted.
 */
export async function scanApp(app: InstalledApp, allApps: InstalledApp[]): Promise<ScanResult> {
  const target = buildMatcher(app);
  const others = allApps.map(buildMatcher);

  const [perRoot, bundle, isRunning, bundleInUseBy, caskToken, vendorUninstaller, packageReceipts] = await Promise.all([
    Promise.all(SEARCH_ROOTS.map((root) => scanRoot(root, target, others))),
    describeBundle(app),
    isAppRunning(app),
    processesUsing(app.path),
    findCaskToken(app),
    findVendorUninstaller(app),
    findPackageReceipts(app),
  ]);

  const leftovers = perRoot.flat();
  const sizes = await measurePaths([...leftovers.map((item) => item.path), ...(bundle ? [bundle.path] : [])]);

  for (const item of leftovers) {
    item.size = sizes[item.path] ?? 0;
  }
  if (bundle) {
    bundle.size = sizes[bundle.path] ?? bundle.size;
  }

  leftovers.sort(
    (a, b) =>
      CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence] || b.size - a.size || a.path.localeCompare(b.path),
  );

  return { app, bundle, leftovers, isRunning, bundleInUseBy, caskToken, vendorUninstaller, packageReceipts };
}
