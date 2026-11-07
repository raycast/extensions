import { environment } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { Preset, PresetFile } from "./types";

/** User presets live under the extension support directory (not ~/.config). */
export const USER_PRESET_PATH = path.join(environment.supportPath, "presets.json");

/** Pre-store path; migrated into supportPath on first read if still present. */
const LEGACY_PRESET_PATH = path.join(homedir(), ".config", "resize", "presets.json");

const CLASSES = ["laptop", "tablet", "phone", "custom"];

// Hand-edited presets.json can hold anything. Normalize a raw object into a valid
// Preset, filling sensible defaults for optional fields; return null if the fields
// every command depends on (id, name, positive viewport) are missing or malformed,
// so one bad entry is skipped instead of crashing Resize, Cycle, and Measure.
function normalizePreset(raw: unknown, base?: Preset): Preset | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const merged = { ...(base ?? {}), ...r } as Record<string, unknown>;

  const id = typeof merged.id === "string" ? merged.id.trim() : "";
  const name = typeof merged.name === "string" ? merged.name.trim() : "";
  const vp = merged.viewport as Record<string, unknown> | undefined;
  const w = typeof vp?.w === "number" ? vp.w : NaN;
  const h = typeof vp?.h === "number" ? vp.h : NaN;
  if (!id || !name || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return null;
  }

  return {
    id,
    name,
    class: CLASSES.includes(merged.class as string) ? (merged.class as Preset["class"]) : "custom",
    viewport: { w, h },
    basis: merged.basis === "screen" || merged.basis === "split" ? merged.basis : "custom",
    dpr: typeof merged.dpr === "number" && merged.dpr > 0 ? merged.dpr : 2,
    pointer: merged.pointer === "coarse" ? "coarse" : "fine",
    hover: typeof merged.hover === "boolean" ? merged.hover : merged.pointer !== "coarse",
    strategy: merged.strategy === "info" ? "info" : "window",
    warnings: Array.isArray(merged.warnings) ? merged.warnings.filter((x) => typeof x === "string") : [],
  };
}

function readUserFile(filePath: string): PresetFile | undefined {
  if (!existsSync(filePath)) return undefined;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    // unreadable user file: fall back to built-ins rather than breaking every command
    return undefined;
  }
}

function migrateLegacyPresets(): void {
  if (existsSync(USER_PRESET_PATH) || !existsSync(LEGACY_PRESET_PATH)) return;
  try {
    mkdirSync(path.dirname(USER_PRESET_PATH), { recursive: true });
    writeFileSync(USER_PRESET_PATH, readFileSync(LEGACY_PRESET_PATH));
  } catch {
    // migration is best-effort; load will still read the legacy path below
  }
}

export function loadPresets(): { presets: Preset[]; cycle: string[]; fileCycle?: string[] } {
  const bundled: PresetFile = JSON.parse(readFileSync(path.join(environment.assetsPath, "devices.json"), "utf8"));

  migrateLegacyPresets();
  const user = readUserFile(USER_PRESET_PATH) ?? readUserFile(LEGACY_PRESET_PATH);

  const byId = new Map<string, Preset>();
  for (const p of Array.isArray(bundled.presets) ? bundled.presets : []) {
    const valid = normalizePreset(p);
    if (valid) byId.set(valid.id, valid);
  }
  for (const p of Array.isArray(user?.presets) ? user!.presets : []) {
    const rawId = typeof (p as Preset)?.id === "string" ? (p as Preset).id.trim() : "";
    const valid = normalizePreset(p, rawId ? byId.get(rawId) : undefined);
    if (valid) byId.set(valid.id, valid);
  }

  const userCycle = Array.isArray(user?.cycle)
    ? user!.cycle.filter((x): x is string => typeof x === "string")
    : undefined;

  return {
    presets: [...byId.values()],
    cycle: userCycle ?? (Array.isArray(bundled.cycle) ? bundled.cycle : []),
    fileCycle: userCycle,
  };
}

/** Ensure the support-folder presets file exists so Action.Open can reveal it. */
export function ensureUserPresetFile(): string {
  migrateLegacyPresets();
  if (!existsSync(USER_PRESET_PATH)) {
    mkdirSync(path.dirname(USER_PRESET_PATH), { recursive: true });
    writeFileSync(USER_PRESET_PATH, JSON.stringify({ version: 1, presets: [] }, null, 2) + "\n");
  }
  return USER_PRESET_PATH;
}

export function saveUserPreset(preset: Preset): void {
  migrateLegacyPresets();
  let file: PresetFile = { version: 1, presets: [] };
  const existingFile = readUserFile(USER_PRESET_PATH) ?? readUserFile(LEGACY_PRESET_PATH);
  if (existingFile) file = existingFile;

  const existing = Array.isArray(file.presets) ? file.presets : [];
  file.presets = [...existing.filter((p) => p?.id !== preset.id), preset];
  mkdirSync(path.dirname(USER_PRESET_PATH), { recursive: true });
  writeFileSync(USER_PRESET_PATH, JSON.stringify(file, null, 2) + "\n");
}

export function presetDeeplink(preset: Preset): string {
  const args = encodeURIComponent(JSON.stringify({ preset: preset.id }));
  return `raycast://extensions/ali_reza_mohammad_poor/chrome-viewport/apply-preset?arguments=${args}`;
}
