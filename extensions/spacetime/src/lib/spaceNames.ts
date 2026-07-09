import { environment } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Per-space configuration keyed by the stable macOS space id: a custom name and
 * an optional keyboard shortcut (AppleScript key code + modifiers) used to
 * switch to the space. macOS has no notion of named spaces, so this is the
 * extension's own mapping. Stored as a small JSON file so the (synchronous)
 * display code can read it without async plumbing.
 */

export interface SpaceConfig {
  name?: string;
  /** AppleScript key code, e.g. "18" for the "1" key. */
  keyCode?: string;
  /** AppleScript modifiers, e.g. ["control down"]. */
  modifiers?: string[];
}

export const MODIFIER_OPTIONS: { value: string; title: string }[] = [
  { value: "control down", title: "Control (⌃)" },
  { value: "option down", title: "Option (⌥)" },
  { value: "shift down", title: "Shift (⇧)" },
  { value: "command down", title: "Command (⌘)" },
];

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
      else if (v && typeof v === "object") out[k] = v as SpaceConfig;
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

/** Writes the full config for a space id (empty config removes the entry). */
export function setSpaceConfig(id: number, config: SpaceConfig): void {
  const map = { ...getSpaceConfigs() };
  const clean: SpaceConfig = {};
  if (config.name && config.name.trim()) clean.name = config.name.trim();
  if (config.keyCode && String(config.keyCode).trim()) clean.keyCode = String(config.keyCode).trim();
  if (config.modifiers && config.modifiers.length) clean.modifiers = config.modifiers;
  if (Object.keys(clean).length === 0) delete map[String(id)];
  else map[String(id)] = clean;
  mkdirSync(environment.supportPath, { recursive: true });
  writeFileSync(file(), JSON.stringify(map, null, 2), "utf8");
  cache = { at: Date.now(), map };
}

/** Sets just the name, preserving any configured shortcut. */
export function setSpaceName(id: number, name: string): void {
  setSpaceConfig(id, { ...getSpaceConfig(id), name });
}

/** Clears the custom name, preserving any configured shortcut. */
export function clearSpaceName(id: number): void {
  const cfg = getSpaceConfig(id) ?? {};
  setSpaceConfig(id, { ...cfg, name: undefined });
}
