import { LocalStorage } from "@raycast/api";
import { PLATFORMS } from "./heatmaps";

/**
 * Persistent state for which platforms are shown in the list and in what
 * order. Lives in Raycast's LocalStorage (per-user, per-extension).
 *
 * Both arrays are ordered lists of platform IDs. Together they partition the
 * full set of known platforms.
 */
export type PlatformsConfig = {
  included: string[];
  excluded: string[];
};

const STORAGE_KEY = "platforms-config-v1";

function defaultConfig(): PlatformsConfig {
  return { included: PLATFORMS.map((p) => p.id), excluded: [] };
}

/**
 * Reconcile any stored config with the set of platforms we ship today:
 *  - drop IDs that no longer exist
 *  - any newly added platform appears in `included` at the end (more
 *    discoverable than hiding it in `excluded`)
 */
function reconcile(stored: PlatformsConfig): PlatformsConfig {
  const known = new Set(PLATFORMS.map((p) => p.id));
  const included = stored.included.filter((id) => known.has(id));
  const excluded = stored.excluded.filter((id) => known.has(id));
  const seen = new Set([...included, ...excluded]);
  for (const p of PLATFORMS) {
    if (!seen.has(p.id)) included.push(p.id);
  }
  return { included, excluded };
}

export async function loadPlatformsConfig(): Promise<PlatformsConfig> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return defaultConfig();
  try {
    const parsed = JSON.parse(raw) as PlatformsConfig;
    if (!Array.isArray(parsed.included) || !Array.isArray(parsed.excluded)) {
      return defaultConfig();
    }
    return reconcile(parsed);
  } catch {
    return defaultConfig();
  }
}

export async function savePlatformsConfig(
  config: PlatformsConfig,
): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// ─── Pure helpers ──────────────────────────────────────────────────────────
// All return a new PlatformsConfig — caller is responsible for persisting.

export function moveUp(cfg: PlatformsConfig, id: string): PlatformsConfig {
  const i = cfg.included.indexOf(id);
  if (i <= 0) return cfg;
  const next = [...cfg.included];
  [next[i - 1], next[i]] = [next[i], next[i - 1]];
  return { ...cfg, included: next };
}

export function moveDown(cfg: PlatformsConfig, id: string): PlatformsConfig {
  const i = cfg.included.indexOf(id);
  if (i < 0 || i >= cfg.included.length - 1) return cfg;
  const next = [...cfg.included];
  [next[i + 1], next[i]] = [next[i], next[i + 1]];
  return { ...cfg, included: next };
}

export function exclude(cfg: PlatformsConfig, id: string): PlatformsConfig {
  if (!cfg.included.includes(id)) return cfg;
  return {
    included: cfg.included.filter((x) => x !== id),
    excluded: [...cfg.excluded, id],
  };
}

export function include(cfg: PlatformsConfig, id: string): PlatformsConfig {
  if (!cfg.excluded.includes(id)) return cfg;
  return {
    included: [...cfg.included, id],
    excluded: cfg.excluded.filter((x) => x !== id),
  };
}
