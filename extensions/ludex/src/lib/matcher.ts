import * as fs from "fs";
import { getCurrentOS, resolveAndExpand } from "./path-resolver";
import type {
  InstalledGame,
  ManifestIndex,
  GameWithPaths,
  ResolvedPath,
  Store,
} from "./types";

// Store names used in the manifest's `when.store` field
const STORE_MANIFEST_NAMES: Record<Store, string[]> = {
  steam: ["steam"],
  gog: ["gog"],
  epic: ["epic"],
  xbox: ["microsoft", "xbox"],
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function deduplicatePaths(paths: ResolvedPath[]): ResolvedPath[] {
  const seen = new Set<string>();
  return paths.filter((p) => {
    if (seen.has(p.path)) return false;
    seen.add(p.path);
    return true;
  });
}

export function matchGames(
  installedGames: InstalledGame[],
  manifestIndex: ManifestIndex,
): GameWithPaths[] {
  const currentOS = getCurrentOS();

  // Build lookup indices
  const bySteamId = new Map<number, string>();
  const byGogId = new Map<number, string>();
  const byNormalizedName = new Map<string, string>();

  for (const [manifestName, entry] of Object.entries(manifestIndex)) {
    if (entry.steamId) bySteamId.set(entry.steamId, manifestName);
    if (entry.gogId) byGogId.set(entry.gogId, manifestName);
    byNormalizedName.set(normalizeName(manifestName), manifestName);
  }

  const results: GameWithPaths[] = [];

  for (const game of installedGames) {
    // 1. Try exact ID match
    let manifestName: string | undefined;

    if (game.store === "steam" && game.storeGameId) {
      manifestName = bySteamId.get(parseInt(game.storeGameId, 10));
    } else if (game.store === "gog" && game.storeGameId) {
      manifestName = byGogId.get(parseInt(game.storeGameId, 10));
    }

    // 2. Fallback: normalized name match
    if (!manifestName) {
      manifestName = byNormalizedName.get(normalizeName(game.name));
    }

    if (!manifestName) continue;

    const entry = manifestIndex[manifestName];
    const storeAliases = STORE_MANIFEST_NAMES[game.store] ?? [game.store];

    const savePaths: ResolvedPath[] = [];
    const configPaths: ResolvedPath[] = [];

    for (const file of entry.files) {
      // OS filter
      if (file.os && file.os !== currentOS) continue;

      // Store filter (undefined = any store)
      if (file.store && !storeAliases.includes(file.store)) continue;

      const resolved = resolveAndExpand(
        file.template,
        game.installPath,
        game.storeRoot,
      );

      for (const p of resolved) {
        const rp: ResolvedPath = {
          path: p,
          exists: !p.includes("*") && fs.existsSync(p),
          tags: file.tags,
          os: file.os,
          store: file.store,
        };
        if (file.tags.includes("save")) savePaths.push(rp);
        if (file.tags.includes("config")) configPaths.push(rp);
      }
    }

    if (savePaths.length === 0 && configPaths.length === 0) continue;

    results.push({
      name: manifestName,
      store: game.store,
      storeGameId: game.storeGameId,
      launchTarget: game.launchTarget,
      iconPath: game.iconPath,
      savePaths: deduplicatePaths(savePaths),
      configPaths: deduplicatePaths(configPaths),
    });
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}
