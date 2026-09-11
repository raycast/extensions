import { environment } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Per-space configuration keyed by the stable macOS space id: just a custom
 * name. macOS has no notion of named spaces, so this is the extension's own
 * mapping. Switching is position-based (see desktopShortcuts), so no keyboard
 * shortcut is stored per space. Stored as a small JSON file so the (synchronous)
 * display code can read it without async plumbing.
 */

export interface SpaceConfig {
  name?: string;
}

function file(): string {
  return join(environment.supportPath, "space-names.json");
}

let cache: { at: number; map: Record<string, SpaceConfig> } | undefined;
const TTL_MS = 3000;

function normalize(raw: unknown): Record<string, SpaceConfig> {
  const out: Record<string, SpaceConfig> = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "string")
        out[k] = { name: v }; // legacy: id -> name string
      else if (v && typeof v === "object" && typeof (v as SpaceConfig).name === "string")
        out[k] = { name: (v as SpaceConfig).name }; // keep only the name (drop legacy keyCode/modifiers)
    }
  }
  return out;
}

export function getSpaceConfigs(): Record<string, SpaceConfig> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.map;
  let map: Record<string, SpaceConfig> = {};
  try {
    if (existsSync(file())) map = normalize(JSON.parse(readFileSync(file(), "utf8")));
  } catch {
    map = {};
  }
  cache = { at: now, map };
  return map;
}

export function getSpaceConfig(id: number | undefined): SpaceConfig | undefined {
  if (id == null) return undefined;
  return getSpaceConfigs()[String(id)];
}

/** Custom name for a space id, or undefined if none is set. */
export function nameForId(id: number | undefined): string | undefined {
  const name = getSpaceConfig(id)?.name;
  return name && name.trim() ? name : undefined;
}

/** Sets (or clears, when empty) the custom name for a space id. */
export function setSpaceName(id: number, name: string): void {
  const map = { ...getSpaceConfigs() };
  const trimmed = name.trim();
  if (trimmed) map[String(id)] = { name: trimmed };
  else delete map[String(id)];
  mkdirSync(environment.supportPath, { recursive: true });
  writeFileSync(file(), JSON.stringify(map, null, 2), "utf8");
  cache = { at: Date.now(), map };
}

/** Clears the custom name for a space id. */
export function clearSpaceName(id: number): void {
  setSpaceName(id, "");
}
