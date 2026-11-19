import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import * as TOML from "smol-toml";
import {
  addEntryToToml,
  deleteEntryFromToml,
  updateEntryInToml,
  assertKnownKeysOnly,
  entryFingerprint,
} from "./config-surgery.mjs";
import {
  productionIO,
  resolveTarget,
  commitConfig,
  computeRevision as ioComputeRevision,
} from "./config-io.mjs";

export { computeRevision, entryFingerprint } from "./config-surgery.mjs";
export { productionIO } from "./config-io.mjs";
export type { ConfigIO } from "./config-io.mjs";

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

// --- Raw TOML types ---

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
  /** Semantic fingerprint of the entry for stale-revision detection */
  fingerprint: string;
}

// ── Config snapshot / revision ─────────────────────────────────────────

/**
 * Target identity captured at snapshot time. Carried through mutation
 * to commit to detect symlink retargeting or file replacement.
 */
export interface TargetIdentity {
  resolvedPath: string;
  dev: number;
  ino: number;
}

export interface ConfigSnapshot {
  content: string;
  revision: string;
  items: RemapItem[];
  /** Target identity from loadSnapshot, carried to commit for revalidation */
  target: TargetIdentity | null;
}

// ── Formatting helpers ────────────────────────────────────────────────

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

// ── Read / parse ───────────────────────────────────────────────────────

export function readConfig(): RawConfig {
  const content = readFileSync(CONFIG_PATH, "utf-8");
  return TOML.parse(content) as unknown as RawConfig;
}

/**
 * Build RemapItem[] from raw content (parses once).
 */
function buildItems(content: string): RemapItem[] {
  const config = TOML.parse(content) as unknown as RawConfig;
  const items: RemapItem[] = [];

  (config.modifier_remap ?? []).forEach((r, i) => {
    const fmt = formatModifierRemap(r);
    items.push({
      id: `modifier_remap:${i}`,
      type: "modifier_remap",
      ...fmt,
      raw: r,
      fingerprint: entryFingerprint(r as unknown as Record<string, unknown>),
    });
  });

  (config.remap ?? []).forEach((r, i) => {
    const fmt = formatRemap(r);
    items.push({
      id: `remap:${i}`,
      type: "remap",
      ...fmt,
      raw: r,
      fingerprint: entryFingerprint(r as unknown as Record<string, unknown>),
    });
  });

  (config.tap_hold ?? []).forEach((r, i) => {
    const fmt = formatTapHold(r);
    items.push({
      id: `tap_hold:${i}`,
      type: "tap_hold",
      ...fmt,
      raw: r,
      fingerprint: entryFingerprint(r as unknown as Record<string, unknown>),
    });
  });

  (config.conditional_remap ?? []).forEach((r, i) => {
    const fmt = formatConditionalRemap(r);
    items.push({
      id: `conditional_remap:${i}`,
      type: "conditional_remap",
      ...fmt,
      raw: r,
      fingerprint: entryFingerprint(r as unknown as Record<string, unknown>),
    });
  });

  (config.chord ?? []).forEach((r, i) => {
    const fmt = formatChord(r);
    items.push({
      id: `chord:${i}`,
      type: "chord",
      ...fmt,
      raw: r,
      fingerprint: entryFingerprint(r as unknown as Record<string, unknown>),
    });
  });

  return items;
}

/**
 * Load a config snapshot for the UI. Captures:
 *   - content (raw bytes)
 *   - revision (SHA-256)
 *   - items (with fingerprints)
 *   - target identity (resolvedPath, dev, ino) for commit revalidation
 *
 * If the config file is missing, returns an empty snapshot with target=null.
 * If the file exists but is malformed/unreadable, throws.
 */
export function loadSnapshot(io = productionIO): ConfigSnapshot {
  const target = resolveTarget(io, CONFIG_PATH);
  if (target === null) {
    return {
      content: "",
      revision: "",
      items: [],
      target: null,
    };
  }
  const content = io.read(target.resolved);
  const revision = ioComputeRevision(content);
  const items = buildItems(content);
  return {
    content,
    revision,
    items,
    target: {
      resolvedPath: target.resolved,
      dev: target.dev,
      ino: target.ino,
    },
  };
}

/**
 * Get remap items for display (backward-compatible read-only).
 */
export function getRemapItems(): RemapItem[] {
  const snapshot = loadSnapshot();
  return snapshot.items;
}

// ── Mutation entrypoints (all route through atomic I/O) ───────────────

/**
 * Delete a remap. Requires document revision + entry fingerprint + target
 * identity from the snapshot captured at UI display time.
 */
export function deleteRemap(
  id: string,
  documentRevision: string,
  expectedFingerprint: string,
  target: TargetIdentity | null,
  io = productionIO,
): void {
  if (target === null) {
    throw new Error(
      "Config file not found. Cannot delete from a missing file.",
    );
  }
  const [type, indexStr] = id.split(":");
  const index = parseInt(indexStr, 10);

  // Read current content via the CARRIED resolved path (not re-resolved)
  const content = io.read(target.resolvedPath);

  // Verify entry fingerprint hasn't changed
  const items = buildItems(content);
  const item = items.find((i) => i.id === id);
  if (!item) {
    throw new Error(`Entry not found: ${id}`);
  }
  if (item.fingerprint !== expectedFingerprint) {
    throw new Error(
      "The selected entry has changed since it was loaded. " +
        "Reload the config and try again.",
    );
  }

  assertKnownKeysOnly(content);
  const newContent = deleteEntryFromToml(content, type, index);
  // Pass target identity to commitConfig for revalidation
  commitConfig(
    newContent,
    documentRevision,
    CONFIG_PATH,
    io,
    target.resolvedPath,
    target.dev,
    target.ino,
  );
}

/**
 * Update a remap. Requires document revision + entry fingerprint + target
 * identity from the snapshot captured at UI display time.
 */
export function updateRemap(
  id: string,
  data: Record<string, unknown>,
  documentRevision: string,
  expectedFingerprint: string,
  target: TargetIdentity | null,
  io = productionIO,
): void {
  if (target === null) {
    throw new Error("Config file not found. Cannot update a missing file.");
  }
  const [type, indexStr] = id.split(":");
  const index = parseInt(indexStr, 10);

  // Read current content via the CARRIED resolved path
  const content = io.read(target.resolvedPath);

  const items = buildItems(content);
  const item = items.find((i) => i.id === id);
  if (!item) {
    throw new Error(`Entry not found: ${id}`);
  }
  if (item.fingerprint !== expectedFingerprint) {
    throw new Error(
      "The selected entry has changed since it was loaded. " +
        "Reload the config and try again.",
    );
  }

  assertKnownKeysOnly(content);
  const newContent = updateEntryInToml(content, type, index, data);
  commitConfig(
    newContent,
    documentRevision,
    CONFIG_PATH,
    io,
    target.resolvedPath,
    target.dev,
    target.ino,
  );
}

/**
 * Add a remap entry. Reads a fresh snapshot at action time for adds.
 * If the config file is missing, creates it with the first entry.
 * No target identity needed (adds don't modify existing entries).
 */
export function addRemapEntry(
  sectionType: string,
  entry: Record<string, unknown>,
  io = productionIO,
): void {
  const target = resolveTarget(io, CONFIG_PATH);

  if (target === null) {
    const newContent = addEntryToToml("", sectionType, entry);
    commitConfig(newContent, "", CONFIG_PATH, io);
    return;
  }

  // File exists — read fresh snapshot and add
  const content = io.read(target.resolved);
  assertKnownKeysOnly(content);
  const newContent = addEntryToToml(content, sectionType, entry);
  const revision = ioComputeRevision(content);
  // Pass resolved target identity for existing-file revalidation
  commitConfig(
    newContent,
    revision,
    CONFIG_PATH,
    io,
    target.resolved,
    target.dev,
    target.ino,
  );
}
