/**
 * Derives view-ready package rows from the index. All cross-slice lookups go
 * through maps built once per index revision — no O(n·m) scans in render paths.
 */

import { type WingetSource } from "../cli/types";
import { type PackageIndex } from "../core/index-store";
import { getCachedDetails } from "../hooks/useDetails";

import { calculateRelevanceScore } from "./ranking";

interface PackageInfo {
  id: string;
  name: string;
  version: string;
  source: WingetSource;
  isInstalled: boolean;
  hasUpdate: boolean;
  isPinned: boolean;
  installedVersion?: string;
  availableVersion?: string;
  requiresExplicitTargeting?: boolean;
  /**
   * Another version of the same (source, id) is installed alongside this row.
   * Uninstalls must then target this row's exact version — winget refuses an
   * ambiguous uninstall of a multi-version package.
   */
  hasSiblingVersions?: boolean;
}

/**
 * Stable list-item identity: source|id only. Versions change when operations
 * succeed — including them in the id would make the List lose selection (and
 * reset the detail pane) after every upgrade.
 */
function makeItemId(pkg: { id: string; source: string }): string {
  return `${pkg.source}|${pkg.id}`;
}

interface IndexLookups {
  installedByKey: Map<string, { version: string; name: string }>;
  upgradeByKey: Map<string, { available: string; version: string; requiresExplicitTargeting?: boolean }>;
  pinnedKeys: Set<string>;
  /** Untruncated catalog names by key, for repairing truncated list/upgrade names. */
  catalogNameByKey: Map<string, string>;
}

function buildLookups(index: PackageIndex): IndexLookups {
  const installedByKey = new Map<string, { version: string; name: string }>();
  for (const pkg of index.installed) {
    installedByKey.set(makeItemId(pkg), {
      version: pkg.version,
      name: pkg.name,
    });
  }
  const upgradeByKey = new Map<string, { available: string; version: string; requiresExplicitTargeting?: boolean }>();
  for (const pkg of index.upgradable) {
    upgradeByKey.set(makeItemId(pkg), {
      available: pkg.available,
      version: pkg.version,
      requiresExplicitTargeting: pkg.requiresExplicitTargeting,
    });
  }
  const pinnedKeys = new Set<string>();
  for (const pkg of index.pinned) {
    pinnedKeys.add(makeItemId(pkg));
  }
  const catalogNameByKey = new Map<string, string>();
  for (const pkg of index.packages) {
    if (!pkg.truncatedFields?.includes("name")) {
      catalogNameByKey.set(makeItemId(pkg), pkg.name);
    }
  }
  return { installedByKey, upgradeByKey, pinnedKeys, catalogNameByKey };
}

/** Prefer the catalog's untruncated name for rows winget truncated. */
function repairedName(row: { name: string; truncatedFields?: string[] }, key: string, lookups: IndexLookups): string {
  if (row.truncatedFields?.includes("name")) {
    return lookups.catalogNameByKey.get(key) ?? row.name;
  }
  return row.name;
}

function searchRows(index: PackageIndex, lookups: IndexLookups, query: string): PackageInfo[] {
  const seen = new Set<string>();
  const rows: { pkg: PackageIndex["packages"][number]; score: number }[] = [];
  const lowerQuery = query.toLowerCase().trim();

  for (const pkg of index.packages) {
    const key = makeItemId(pkg);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (!lowerQuery) {
      rows.push({ pkg, score: 0 });
      continue;
    }
    const score = calculateRelevanceScore(pkg, lowerQuery, getCachedDetails(pkg.id, pkg.source) ?? undefined);
    if (score > 0) {
      rows.push({ pkg, score });
    }
  }

  if (lowerQuery) {
    rows.sort((left, right) =>
      right.score !== left.score ? right.score - left.score : left.pkg.name.localeCompare(right.pkg.name),
    );
  }

  return rows.map(({ pkg }) => {
    const key = makeItemId(pkg);
    const installed = lookups.installedByKey.get(key);
    const upgrade = lookups.upgradeByKey.get(key);
    return {
      id: pkg.id,
      name: repairedName(pkg, key, lookups),
      version: pkg.version,
      source: pkg.source,
      isInstalled: installed !== undefined,
      hasUpdate: upgrade !== undefined,
      isPinned: lookups.pinnedKeys.has(key),
      installedVersion: installed?.version,
      availableVersion: upgrade?.available,
    };
  });
}

function installedRows(index: PackageIndex, lookups: IndexLookups): PackageInfo[] {
  // Dedupe by the full composite key: the same (source,id) appears once per
  // installed version (side-by-side runtimes) and every version must stay
  // visible.
  const seen = new Set<string>();
  const rows: PackageInfo[] = [];
  for (const pkg of index.installed) {
    const dedupeKey = `${makeItemId(pkg)}|${pkg.version}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    const key = makeItemId(pkg);
    const upgrade = lookups.upgradeByKey.get(key);
    rows.push({
      id: pkg.id,
      name: repairedName(pkg, key, lookups),
      version: pkg.version,
      source: pkg.source,
      isInstalled: true,
      hasUpdate: upgrade !== undefined,
      isPinned: lookups.pinnedKeys.has(key),
      installedVersion: pkg.version,
      availableVersion: upgrade?.available,
    });
  }

  // Mark rows whose (source, id) is installed in more than one version.
  const keyCounts = new Map<string, number>();
  for (const row of rows) {
    const key = makeItemId(row);
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }
  for (const row of rows) {
    if ((keyCounts.get(makeItemId(row)) ?? 0) > 1) {
      row.hasSiblingVersions = true;
    }
  }
  return rows;
}

function upgradableRows(index: PackageIndex, lookups: IndexLookups): PackageInfo[] {
  const seen = new Set<string>();
  const rows: PackageInfo[] = [];
  for (const pkg of index.upgradable) {
    const key = makeItemId(pkg);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push({
      id: pkg.id,
      name: repairedName(pkg, key, lookups),
      version: pkg.version,
      source: pkg.source,
      isInstalled: true,
      hasUpdate: true,
      isPinned: lookups.pinnedKeys.has(key),
      installedVersion: pkg.version,
      availableVersion: pkg.available,
      requiresExplicitTargeting: pkg.requiresExplicitTargeting,
    });
  }
  return rows;
}

/** Display names that occur more than once (show versions only for those). */
function duplicateNameSet(rows: PackageInfo[]): Set<string> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name));
}

export {
  buildLookups,
  duplicateNameSet,
  installedRows,
  makeItemId,
  searchRows,
  upgradableRows,
  type IndexLookups,
  type PackageInfo,
};
