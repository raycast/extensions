import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { environment } from "@raycast/api";

const DOCK_DOMAIN = "com.apple.dock";

export type CornerId = "tl" | "tr" | "bl" | "br";

export type CornerSetting = {
  corner: number;
  modifier: number;
};

export type HotCornerSettings = Record<CornerId, CornerSetting>;

const CORNER_KEYS: Record<CornerId, { corner: string; modifier: string }> = {
  tl: { corner: "wvous-tl-corner", modifier: "wvous-tl-modifier" },
  tr: { corner: "wvous-tr-corner", modifier: "wvous-tr-modifier" },
  bl: { corner: "wvous-bl-corner", modifier: "wvous-bl-modifier" },
  br: { corner: "wvous-br-corner", modifier: "wvous-br-modifier" },
};

export const DISABLED_CORNER: CornerSetting = { corner: 0, modifier: 0 };

const CORNER_IDS = Object.keys(CORNER_KEYS) as CornerId[];

function isValidCornerSetting(value: unknown): value is CornerSetting {
  if (value === null || typeof value !== "object") return false;
  const s = value as { corner?: unknown; modifier?: unknown };
  if (typeof s.corner !== "number" || typeof s.modifier !== "number") return false;
  return Number.isFinite(s.corner) && Number.isFinite(s.modifier);
}

/** Returns valid settings or null (e.g. corrupt JSON, wrong shape, non-finite numbers). */
export function tryParseHotCornerSettings(value: unknown): HotCornerSettings | null {
  if (value === null || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const out = {} as HotCornerSettings;
  for (const id of CORNER_IDS) {
    const s = o[id];
    if (!isValidCornerSetting(s)) return null;
    out[id] = { corner: s.corner, modifier: s.modifier };
  }
  return out;
}

/** Parse JSON from LocalStorage or backup; returns null if missing or invalid. */
export function tryParseHotCornerSettingsJson(raw: string | undefined): HotCornerSettings | null {
  if (raw == null || raw === "") return null;
  try {
    return tryParseHotCornerSettings(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function defaultsRead(domain: string, key: string): number | null {
  try {
    const out = execFileSync("/usr/bin/defaults", ["read", domain, key], {
      encoding: "utf8",
    });
    const n = Number.parseInt(out.trim(), 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function defaultsWrite(domain: string, key: string, value: number): void {
  execFileSync("/usr/bin/defaults", ["write", domain, key, "-int", String(value)]);
}

export function readHotCornerSettings(): HotCornerSettings {
  const result = {} as HotCornerSettings;
  for (const id of CORNER_IDS) {
    const { corner, modifier } = CORNER_KEYS[id];
    result[id] = {
      corner: defaultsRead(DOCK_DOMAIN, corner) ?? 0,
      modifier: defaultsRead(DOCK_DOMAIN, modifier) ?? 0,
    };
  }
  return result;
}

export function applyHotCornerSettings(settings: HotCornerSettings): void {
  const valid = tryParseHotCornerSettings(settings);
  if (!valid) {
    throw new Error("Invalid hot corner settings");
  }
  for (const id of CORNER_IDS) {
    const { corner, modifier } = CORNER_KEYS[id];
    const s = valid[id];
    defaultsWrite(DOCK_DOMAIN, corner, s.corner);
    defaultsWrite(DOCK_DOMAIN, modifier, s.modifier);
  }
  restartDock();
}

export function restartDock(): void {
  try {
    execFileSync("/usr/bin/killall", ["Dock"]);
  } catch {
    // Dock may not be running in edge environments; ignore
  }
}

export function settingsEqual(a: HotCornerSettings, b: HotCornerSettings): boolean {
  for (const id of CORNER_IDS) {
    if (a[id].corner !== b[id].corner || a[id].modifier !== b[id].modifier) return false;
  }
  return true;
}

export function isDisabledState(settings: HotCornerSettings): boolean {
  return settingsEqual(settings, {
    tl: DISABLED_CORNER,
    tr: DISABLED_CORNER,
    bl: DISABLED_CORNER,
    br: DISABLED_CORNER,
  });
}

// --- Presets (file on disk) ---

export type HotCornerPreset = {
  id: string;
  name: string;
  createdAt: string;
  settings: HotCornerSettings;
};

type PresetsFile = {
  version: 1;
  presets: HotCornerPreset[];
};

function presetsPath(): string {
  return path.join(environment.supportPath, "presets.json");
}

function ensureSupportDir(): void {
  if (!existsSync(environment.supportPath)) {
    mkdirSync(environment.supportPath, { recursive: true });
  }
}

function tryParseHotCornerPreset(entry: unknown): HotCornerPreset | null {
  if (entry === null || typeof entry !== "object") return null;
  const o = entry as Record<string, unknown>;
  if (typeof o.id !== "string" || o.id.length === 0) return null;
  if (typeof o.name !== "string") return null;
  if (typeof o.createdAt !== "string") return null;
  const settings = tryParseHotCornerSettings(o.settings);
  if (!settings) return null;
  return { id: o.id, name: o.name, createdAt: o.createdAt, settings };
}

export function loadPresets(): HotCornerPreset[] {
  const p = presetsPath();
  if (!existsSync(p)) return [];
  try {
    const raw = readFileSync(p, "utf8");
    const data = JSON.parse(raw) as PresetsFile;
    if (data.version !== 1 || !Array.isArray(data.presets)) return [];
    return data.presets.map((entry) => tryParseHotCornerPreset(entry)).filter((p): p is HotCornerPreset => p !== null);
  } catch {
    return [];
  }
}

export function savePresets(presets: HotCornerPreset[]): void {
  ensureSupportDir();
  const body: PresetsFile = { version: 1, presets };
  writeFileSync(presetsPath(), JSON.stringify(body, null, 2), "utf8");
}

export function addPreset(name: string, settings: HotCornerSettings): HotCornerPreset {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Preset name is required");

  const preset: HotCornerPreset = {
    id: randomUUID(),
    name: trimmed,
    createdAt: new Date().toISOString(),
    settings,
  };

  const presets = loadPresets();
  presets.push(preset);
  savePresets(presets);
  return preset;
}

export function removePreset(id: string): HotCornerPreset[] {
  const presets = loadPresets().filter((p) => p.id !== id);
  savePresets(presets);
  return presets;
}

/** Swap preset with its neighbor in the ordered list. `delta` −1 = up, +1 = down. */
export function movePreset(id: string, delta: -1 | 1): HotCornerPreset[] {
  const presets = [...loadPresets()];
  const i = presets.findIndex((p) => p.id === id);
  if (i < 0) return presets;
  const j = i + delta;
  if (j < 0 || j >= presets.length) return presets;
  const a = presets[i]!;
  const b = presets[j]!;
  presets[i] = b;
  presets[j] = a;
  savePresets(presets);
  return presets;
}
