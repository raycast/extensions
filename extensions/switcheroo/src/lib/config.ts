import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import * as TOML from "smol-toml";

export const CONFIG_PATH = join(
  homedir(),
  ".config",
  "switcheroo",
  "config.toml",
);
export const LOG_PATH = join(
  homedir(),
  "Library",
  "Logs",
  "com.mitchelljphayes.switcheroo",
  "daemon.err",
);
export const PLIST_NAME = "com.mitchelljphayes.switcheroo";

// --- Raw TOML types (what's in the file) ---

export interface RawModifierRemap {
  from: string;
  to: string;
}

export interface RawRemap {
  from: string;
  to: string;
}

export interface RawConditionalRemap {
  modifier: string;
  from: string;
  to: string;
}

export interface RawTapHold {
  key: string;
  tap: string;
  hold: string;
  timeout_ms?: number;
}

export interface RawChord {
  keys: string[];
  emit: string;
  window_ms?: number;
}

export interface RawConfig {
  modifier_remap?: RawModifierRemap[];
  remap?: RawRemap[];
  conditional_remap?: RawConditionalRemap[];
  tap_hold?: RawTapHold[];
  chord?: RawChord[];
}

// --- Parsed config with IDs for list management ---

export type RemapType =
  | "modifier_remap"
  | "remap"
  | "conditional_remap"
  | "tap_hold"
  | "chord";

export interface RemapItem {
  id: string;
  type: RemapType;
  title: string;
  subtitle: string;
  raw:
    | RawModifierRemap
    | RawRemap
    | RawConditionalRemap
    | RawTapHold
    | RawChord;
}

function formatModifierRemap(r: RawModifierRemap): {
  title: string;
  subtitle: string;
} {
  return {
    title: `${r.from} → ${r.to}`,
    subtitle: "Modifier Remap",
  };
}

function formatRemap(r: RawRemap): { title: string; subtitle: string } {
  return {
    title: `${r.from} → ${r.to}`,
    subtitle: "Key Swap",
  };
}

function formatConditionalRemap(r: RawConditionalRemap): {
  title: string;
  subtitle: string;
} {
  return {
    title: `${r.modifier} + ${r.from} → ${r.to}`,
    subtitle: "Conditional Remap",
  };
}

function formatTapHold(r: RawTapHold): { title: string; subtitle: string } {
  return {
    title: `${r.key}: tap → ${r.tap}, hold → ${r.hold}`,
    subtitle: `Tap-Hold (${r.timeout_ms ?? 200}ms)`,
  };
}

function formatChord(r: RawChord): { title: string; subtitle: string } {
  return {
    title: `${r.keys.join(" + ")} → ${r.emit}`,
    subtitle: `Chord (${r.window_ms ?? 100}ms)`,
  };
}

export function readConfig(): RawConfig {
  const content = readFileSync(CONFIG_PATH, "utf-8");
  return TOML.parse(content) as unknown as RawConfig;
}

export function writeConfig(config: RawConfig): void {
  // Build TOML string manually to keep it clean and readable
  const lines: string[] = ["# switcheroo configuration\n"];

  if (config.modifier_remap && config.modifier_remap.length > 0) {
    lines.push(
      "# Kernel-level modifier remaps (applied via hidutil on startup)",
    );
    for (const r of config.modifier_remap) {
      lines.push("[[modifier_remap]]");
      lines.push(`from = "${r.from}"`);
      lines.push(`to = "${r.to}"`);
      lines.push("");
    }
  }

  if (config.remap && config.remap.length > 0) {
    lines.push("# Simple key swaps (unconditional)");
    for (const r of config.remap) {
      lines.push("[[remap]]");
      lines.push(`from = "${r.from}"`);
      lines.push(`to = "${r.to}"`);
      lines.push("");
    }
  }

  if (config.tap_hold && config.tap_hold.length > 0) {
    lines.push("# Tap-hold: tap a modifier for one key, hold it for another");
    for (const r of config.tap_hold) {
      lines.push("[[tap_hold]]");
      lines.push(`key = "${r.key}"`);
      lines.push(`tap = "${r.tap}"`);
      lines.push(`hold = "${r.hold}"`);
      lines.push(`timeout_ms = ${r.timeout_ms ?? 200}`);
      lines.push("");
    }
  }

  if (config.conditional_remap && config.conditional_remap.length > 0) {
    lines.push("# Conditional remaps: when a modifier is held, remap keys");
    for (const r of config.conditional_remap) {
      lines.push("[[conditional_remap]]");
      lines.push(`modifier = "${r.modifier}"`);
      lines.push(`from = "${r.from}"`);
      lines.push(`to = "${r.to}"`);
      lines.push("");
    }
  }

  if (config.chord && config.chord.length > 0) {
    lines.push("# Chords: keys pressed simultaneously within a time window");
    for (const r of config.chord) {
      lines.push("[[chord]]");
      lines.push(`keys = [${r.keys.map((k) => `"${k}"`).join(", ")}]`);
      lines.push(`emit = "${r.emit}"`);
      lines.push(`window_ms = ${r.window_ms ?? 100}`);
      lines.push("");
    }
  }

  writeFileSync(CONFIG_PATH, lines.join("\n") + "\n");
}

export function getRemapItems(): RemapItem[] {
  const config = readConfig();
  const items: RemapItem[] = [];

  (config.modifier_remap ?? []).forEach((r, i) => {
    const fmt = formatModifierRemap(r);
    items.push({
      id: `modifier_remap:${i}`,
      type: "modifier_remap",
      ...fmt,
      raw: r,
    });
  });

  (config.remap ?? []).forEach((r, i) => {
    const fmt = formatRemap(r);
    items.push({ id: `remap:${i}`, type: "remap", ...fmt, raw: r });
  });

  (config.tap_hold ?? []).forEach((r, i) => {
    const fmt = formatTapHold(r);
    items.push({ id: `tap_hold:${i}`, type: "tap_hold", ...fmt, raw: r });
  });

  (config.conditional_remap ?? []).forEach((r, i) => {
    const fmt = formatConditionalRemap(r);
    items.push({
      id: `conditional_remap:${i}`,
      type: "conditional_remap",
      ...fmt,
      raw: r,
    });
  });

  (config.chord ?? []).forEach((r, i) => {
    const fmt = formatChord(r);
    items.push({ id: `chord:${i}`, type: "chord", ...fmt, raw: r });
  });

  return items;
}

export function deleteRemap(id: string): void {
  const [type, indexStr] = id.split(":");
  const index = parseInt(indexStr, 10);
  const config = readConfig();

  const key = type as keyof RawConfig;
  const arr = config[key] as unknown[];
  if (arr && index >= 0 && index < arr.length) {
    arr.splice(index, 1);
  }

  writeConfig(config);
}

export function addRemap(from: string, to: string): void {
  const config = readConfig();
  if (!config.remap) config.remap = [];
  config.remap.push({ from, to });
  writeConfig(config);
}

export function addModifierRemap(from: string, to: string): void {
  const config = readConfig();
  if (!config.modifier_remap) config.modifier_remap = [];
  config.modifier_remap.push({ from, to });
  writeConfig(config);
}

export function addConditionalRemap(
  modifier: string,
  from: string,
  to: string,
): void {
  const config = readConfig();
  if (!config.conditional_remap) config.conditional_remap = [];
  config.conditional_remap.push({ modifier, from, to });
  writeConfig(config);
}

export function addTapHold(
  key: string,
  tap: string,
  hold: string,
  timeout_ms: number,
): void {
  const config = readConfig();
  if (!config.tap_hold) config.tap_hold = [];
  config.tap_hold.push({ key, tap, hold, timeout_ms });
  writeConfig(config);
}

export function addChord(
  keys: string[],
  emit: string,
  window_ms: number,
): void {
  const config = readConfig();
  if (!config.chord) config.chord = [];
  config.chord.push({ keys, emit, window_ms });
  writeConfig(config);
}

export function updateRemap(id: string, data: Record<string, unknown>): void {
  const [type, indexStr] = id.split(":");
  const index = parseInt(indexStr, 10);
  const config = readConfig();

  const key = type as keyof RawConfig;
  const arr = config[key] as unknown[];
  if (!arr || index < 0 || index >= arr.length) {
    throw new Error(`Remap not found: ${id}`);
  }

  arr[index] = data;
  writeConfig(config);
}
