import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, readdir, rm, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const exec = promisify(execFile);

export const BUNDLE_ID = "com.crystalidea.macsfancontrol";
export const PROCESS_NAME = "Macs Fan Control";

/** Macs Fan Control's two built-in presets, in the order it indexes them. */
export const PREDEFINED = [
  { index: 0, name: "Automatic", description: "Every fan controlled by the system" },
  { index: 1, name: "Full Blast", description: "Every fan at maximum speed" },
] as const;

/**
 * How one fan behaves inside a preset.
 *
 * Presets are stored as `Name|<fan0>|<fan1>|…`, where each fan is `0` for
 * automatic or `1,<rpm>` for a constant speed. Macs Fan Control also supports
 * sensor-based fans, whose encoding we deliberately do not interpret — those
 * are carried through untouched as `raw` so a preset built in the app never
 * gets corrupted by a round-trip through Raycast.
 */
export type FanSpec = { kind: "auto" } | { kind: "constant"; rpm: number } | { kind: "raw"; raw: string };

export type CustomPreset = {
  /** Position in the CustomPresets array — this is what `Custom:N` refers to. */
  index: number;
  name: string;
  fans: FanSpec[];
};

export type PresetRef = { type: "predefined"; index: number } | { type: "custom"; index: number };

export class MfcError extends Error {}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/* ------------------------------------------------------------------ */
/* Preset encoding                                                     */
/* ------------------------------------------------------------------ */

export function decodeFanSpec(raw: string): FanSpec {
  if (raw === "0") return { kind: "auto" };
  const m = /^1,(\d+(?:\.\d+)?)$/.exec(raw);
  if (m) return { kind: "constant", rpm: Math.round(Number(m[1])) };
  return { kind: "raw", raw };
}

export function encodeFanSpec(spec: FanSpec): string {
  switch (spec.kind) {
    case "auto":
      return "0";
    case "constant":
      return `1,${Math.round(spec.rpm)}`;
    case "raw":
      return spec.raw;
  }
}

export function decodePreset(blob: string, index: number): CustomPreset | null {
  let text: string;
  try {
    text = Buffer.from(blob, "base64").toString("utf8");
  } catch {
    return null;
  }
  const parts = text.split("|");
  const name = parts[0];
  if (!name) return null;
  return { index, name, fans: parts.slice(1).map(decodeFanSpec) };
}

export function encodePreset(preset: Pick<CustomPreset, "name" | "fans">): string {
  const text = [preset.name, ...preset.fans.map(encodeFanSpec)].join("|");
  return Buffer.from(text, "utf8").toString("base64");
}

/** Human-readable summary of what a preset does, e.g. "Fan 1: 4500 rpm · Fan 2: auto". */
export function describePreset(preset: CustomPreset): string {
  if (preset.fans.length === 0) return "No fans configured";
  return preset.fans
    .map((f, i) => {
      const label = preset.fans.length === 1 ? "Fan" : `Fan ${i + 1}`;
      if (f.kind === "auto") return `${label}: auto`;
      if (f.kind === "constant") return `${label}: ${f.rpm} rpm`;
      return `${label}: sensor-based`;
    })
    .join(" · ");
}

export function presetRefToString(ref: PresetRef): string {
  return ref.type === "predefined" ? `Predefined:${ref.index}` : `Custom:${ref.index}`;
}

export function parsePresetRef(value: string): PresetRef | null {
  const m = /^(Predefined|Custom):(\d+)$/.exec(value.trim());
  if (!m) return null;
  return { type: m[1] === "Predefined" ? "predefined" : "custom", index: Number(m[2]) };
}

/* ------------------------------------------------------------------ */
/* Reading preferences                                                 */
/* ------------------------------------------------------------------ */

/**
 * Export Macs Fan Control's entire preference domain.
 *
 * Goes through `defaults export` rather than reading the plist file directly:
 * cfprefsd caches preferences in memory, so the on-disk file can be stale.
 *
 * Throws on failure — never returns empty. Callers that write preferences rely
 * on this: a read that silently reported "no presets" would cause the next
 * write to erase every preset the user has.
 */
async function exportPrefs(): Promise<string> {
  let stdout: string;
  try {
    ({ stdout } = await exec("/usr/bin/defaults", ["export", BUNDLE_ID, "-"], {
      maxBuffer: 16 * 1024 * 1024,
    }));
  } catch {
    throw new MfcError("Could not read Macs Fan Control's preferences.");
  }
  if (!stdout.includes("<plist")) {
    throw new MfcError("Macs Fan Control's preferences came back unreadable.");
  }
  return stdout;
}

/**
 * Pull a single key out of an already-exported plist.
 *
 * Returns null only when the key is genuinely absent from a plist we read
 * successfully — that is a real "not set yet", not a failure. The full plist
 * cannot be converted to JSON in one go because it holds binary window-geometry
 * blobs, hence the per-key extraction.
 */
async function extractKey(plist: string, key: string, format: "raw" | "json"): Promise<string | null> {
  const child = execFile("/usr/bin/plutil", ["-extract", key, format, "-o", "-", "-"]);
  // execFile puts the child's stdout into string mode, so collect strings —
  // treating these chunks as Buffers throws and loses the value.
  let out = "";
  child.stdout?.on("data", (chunk) => {
    out += chunk;
  });
  child.on("error", () => {
    /* surfaced through the exit code below */
  });
  child.stdin?.end(plist);
  const code = await new Promise<number | null>((resolve) => child.on("close", resolve));
  if (code !== 0) return null;
  return out.trim();
}

/* ------------------------------------------------------------------ */
/* Backups                                                             */
/* ------------------------------------------------------------------ */

const BACKUP_DIR = join(homedir(), "Library", "Application Support", "Raycast Macs Fan Control", "backups");
const BACKUPS_KEPT = 10;

/**
 * Snapshot the preference domain before we modify it.
 *
 * This extension edits another app's configuration, so keep a rolling set of
 * plain `defaults import`-able exports. Best effort: a failed backup must never
 * block the user's actual request.
 */
async function backupPrefs(plist: string): Promise<void> {
  try {
    await mkdir(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await writeFile(join(BACKUP_DIR, `prefs-${stamp}.plist`), plist, "utf8");
    const entries = (await readdir(BACKUP_DIR)).filter((f) => f.endsWith(".plist")).sort();
    for (const stale of entries.slice(0, Math.max(0, entries.length - BACKUPS_KEPT))) {
      await rm(join(BACKUP_DIR, stale), { force: true });
    }
  } catch {
    /* backups are a safety net, not a precondition */
  }
}

export function backupDirectory(): string {
  return BACKUP_DIR;
}

export async function isInstalled(): Promise<boolean> {
  try {
    const { stdout } = await exec("/usr/bin/mdfind", [`kMDItemCFBundleIdentifier == '${BUNDLE_ID}'`]);
    if (stdout.trim().length > 0) return true;
  } catch {
    /* fall through to the conventional location */
  }
  try {
    await exec("/bin/test", ["-d", `/Applications/${PROCESS_NAME}.app`]);
    return true;
  } catch {
    return false;
  }
}

export async function getActivePreset(): Promise<PresetRef | null> {
  const value = await extractKey(await exportPrefs(), "ActivePreset", "raw");
  return value ? parsePresetRef(value) : null;
}

async function presetsFromPlist(plist: string): Promise<CustomPreset[]> {
  const json = await extractKey(plist, "CustomPresets", "json");
  // A successfully-read plist with no CustomPresets key means the user simply
  // has no custom presets yet. A read failure throws above instead.
  if (json === null) return [];
  let blobs: unknown;
  try {
    blobs = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(blobs)) return [];
  return blobs
    .map((b, i) => (typeof b === "string" ? decodePreset(b, i) : null))
    .filter((p): p is CustomPreset => p !== null);
}

export async function getCustomPresets(): Promise<CustomPreset[]> {
  return presetsFromPlist(await exportPrefs());
}

/** Resolve a preset by name, case-insensitively, across custom and built-in presets. */
export function findPresetByName(name: string, customs: CustomPreset[]): { ref: PresetRef; label: string } | null {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return null;

  const custom = customs.find((p) => p.name.toLowerCase() === wanted);
  if (custom) return { ref: { type: "custom", index: custom.index }, label: custom.name };

  const predefined = PREDEFINED.find((p) => p.name.toLowerCase() === wanted);
  if (predefined) return { ref: { type: "predefined", index: predefined.index }, label: predefined.name };

  // Accept a few natural aliases for the built-ins.
  if (["auto", "automatic", "system"].includes(wanted)) {
    return { ref: { type: "predefined", index: 0 }, label: "Automatic" };
  }
  if (["full", "full blast", "max", "maximum", "fullblast"].includes(wanted)) {
    return { ref: { type: "predefined", index: 1 }, label: "Full Blast" };
  }

  // Last resort: a unique prefix match on custom presets.
  const partial = customs.filter((p) => p.name.toLowerCase().startsWith(wanted));
  if (partial.length === 1) {
    return { ref: { type: "custom", index: partial[0].index }, label: partial[0].name };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* App lifecycle                                                       */
/* ------------------------------------------------------------------ */

export async function isRunning(): Promise<boolean> {
  try {
    await exec("/usr/bin/pgrep", ["-x", PROCESS_NAME]);
    return true;
  } catch {
    return false;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function launchApp(): Promise<void> {
  try {
    await exec("/usr/bin/open", ["-b", BUNDLE_ID]);
  } catch {
    await exec("/usr/bin/open", ["-a", PROCESS_NAME]);
  }
  for (let i = 0; i < 30; i++) {
    if (await isRunning()) return;
    await sleep(200);
  }
  throw new MfcError("Macs Fan Control did not start.");
}

export async function quitApp(): Promise<void> {
  if (!(await isRunning())) return;
  try {
    // SIGTERM, so Qt tears down cleanly and hands the fans back to the system.
    await exec("/usr/bin/pkill", ["-x", PROCESS_NAME]);
  } catch {
    /* already gone */
  }
  for (let i = 0; i < 40; i++) {
    if (!(await isRunning())) return;
    await sleep(150);
  }
  throw new MfcError("Macs Fan Control did not quit.");
}

/* ------------------------------------------------------------------ */
/* Writing preferences                                                 */
/* ------------------------------------------------------------------ */

async function writeActivePresetPref(ref: PresetRef): Promise<void> {
  await exec("/usr/bin/defaults", ["write", BUNDLE_ID, "ActivePreset", "-string", presetRefToString(ref)]);
}

async function writeCustomPresetsPref(presets: Pick<CustomPreset, "name" | "fans">[]): Promise<void> {
  await exec("/usr/bin/defaults", [
    "write",
    BUNDLE_ID,
    "CustomPresets",
    "-array",
    ...presets.map((p) => encodePreset(p)),
  ]);
}

/**
 * Apply preference changes and make Macs Fan Control adopt them.
 *
 * Macs Fan Control reads its preferences once at launch and caches them, so a
 * change only takes effect after a restart. It also writes its own preferences
 * on quit, which is why we quit *first* and only then write — otherwise the
 * app's exit would overwrite whatever we just set.
 *
 * Fan control itself stays entirely inside Macs Fan Control: it applies the
 * preset through its own privileged helper. This extension never writes to the
 * SMC and never asks for elevated privileges.
 */
async function mutateAndRestart(mutate: (snapshot: CustomPreset[]) => Promise<void>): Promise<void> {
  if (!(await isInstalled())) {
    throw new MfcError("Macs Fan Control is not installed.");
  }
  // Read before touching anything: this both proves the preferences are
  // readable (so a write can't be based on a failed read) and gives us a
  // restorable snapshot.
  const plist = await exportPrefs();
  await backupPrefs(plist);
  const snapshot = await presetsFromPlist(plist);
  await quitApp();
  let mutationError: unknown;
  try {
    await mutate(snapshot);
  } catch (error) {
    mutationError = error;
  }

  // Always bring the app back, even if the write failed: leaving it stopped
  // would silently hand every fan back to the system, which is a bigger change
  // than the one the user asked for.
  let relaunchError: unknown;
  try {
    await launchApp();
  } catch (error) {
    relaunchError = error;
  }

  // Both failures matter and neither may hide the other: the mutation error
  // says whether the preferences changed, and the relaunch error says the fans
  // are now back under system control rather than on the user's settings.
  if (mutationError !== undefined && relaunchError !== undefined) {
    throw new MfcError(
      `${errorMessage(mutationError)} Macs Fan Control also could not be restarted, ` +
        "so the fans are back under system control.",
    );
  }
  if (mutationError !== undefined) throw mutationError;
  if (relaunchError !== undefined) throw relaunchError;
  // Give the app a moment to push the new speeds to the SMC.
  await sleep(1200);
}

/**
 * Find a preset in a freshly-read list.
 *
 * The numeric index is only a position, so it goes stale if anything inserts or
 * removes a preset while a form or confirmation is open. Match on the name the
 * user actually chose, and only trust the old slot if it still holds that name.
 */
function resolveTarget(list: CustomPreset[], target: CustomPreset): number {
  const sameName = list.filter((p) => p.name === target.name);
  if (sameName.length === 1) return sameName[0].index;
  const atOldSlot = list[target.index];
  if (atOldSlot && atOldSlot.name === target.name) return target.index;
  throw new MfcError(`“${target.name}” is no longer one of your presets.`);
}

export async function applyPreset(ref: PresetRef): Promise<void> {
  await mutateAndRestart(() => writeActivePresetPref(ref));
}

/**
 * The preset list we are willing to treat as "what the user has".
 *
 * `defaults export` answers with an empty-but-valid plist for a domain it
 * cannot really read, so an empty result is ambiguous. When the snapshot taken
 * moments earlier had presets and the re-read has none, that is a failed read,
 * not the user deleting everything — refuse rather than overwrite their data.
 */
function reconcile(snapshot: CustomPreset[], fresh: CustomPreset[]): CustomPreset[] {
  if (fresh.length === 0 && snapshot.length > 0) {
    throw new MfcError("Could not read your presets reliably. Nothing was changed.");
  }
  return fresh;
}

const lower = (values: { name: string }[]) => values.map((p) => p.name.toLowerCase());

/**
 * Rewrite the preset list, refusing any change that would lose a preset the
 * caller did not mean to remove.
 *
 * This exists because the preset list is the user's own data, held in another
 * app. `expectRemoved` names the single preset a delete is allowed to drop;
 * for every other operation nothing may disappear.
 */
async function writePresetsGuarded(
  before: CustomPreset[],
  after: Pick<CustomPreset, "name" | "fans">[],
  expectRemoved?: string,
): Promise<void> {
  const afterNames = new Set(lower(after));
  const missing = lower(before).filter((name) => !afterNames.has(name) && name !== expectRemoved?.toLowerCase());
  if (missing.length > 0) {
    throw new MfcError(
      `Refusing to write: that would have removed ${missing.length} preset(s) — ${missing.join(", ")}. Nothing was changed.`,
    );
  }
  await writeCustomPresetsPref(after);
}

/**
 * Create or overwrite a named preset, then optionally activate it.
 * Matching is case-insensitive, mirroring how the app treats preset names.
 */
export async function upsertPreset(
  name: string,
  fans: FanSpec[],
  options: { activate?: boolean } = {},
): Promise<CustomPreset> {
  const trimmed = name.trim();
  if (!trimmed) throw new MfcError("A preset needs a name.");
  if (trimmed.includes("|")) throw new MfcError("Preset names cannot contain the \u201c|\u201d character.");

  let index = -1;
  await mutateAndRestart(async (snapshot) => {
    // Re-read inside the mutation window so the list we merge into is the one
    // actually on disk right now, not a snapshot from before the app quit.
    const existing = reconcile(snapshot, await getCustomPresets());
    const at = existing.findIndex((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    const next = existing.map((p) => ({ name: p.name, fans: p.fans }));

    if (at >= 0) {
      next[at] = { name: trimmed, fans };
      index = at;
    } else {
      next.push({ name: trimmed, fans });
      index = next.length - 1;
    }

    await writePresetsGuarded(existing, next);
    if (options.activate) await writeActivePresetPref({ type: "custom", index });
  });

  return { index, name: trimmed, fans };
}

export async function renamePreset(target: CustomPreset, newName: string): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed) throw new MfcError("A preset needs a name.");
  if (trimmed.includes("|")) throw new MfcError("Preset names cannot contain the \u201c|\u201d character.");

  await mutateAndRestart(async (snapshot) => {
    const existing = reconcile(snapshot, await getCustomPresets());
    const index = resolveTarget(existing, target);
    const next = existing.map((p) => ({ name: p.name, fans: p.fans }));
    next[index] = { name: trimmed, fans: next[index].fans };
    await writePresetsGuarded(existing, next, existing[index].name);
  });
}

export async function deletePreset(target: CustomPreset): Promise<void> {
  await mutateAndRestart(async (snapshot) => {
    const existing = reconcile(snapshot, await getCustomPresets());
    const index = resolveTarget(existing, target);

    const next = existing.filter((_, i) => i !== index).map((p) => ({ name: p.name, fans: p.fans }));
    const active = await getActivePreset();

    await writePresetsGuarded(existing, next, existing[index].name);
    // Deleting shifts every later preset down one slot, so ActivePreset has to
    // be re-pointed or the app would silently apply the wrong preset.
    if (active?.type === "custom") {
      if (active.index === index) {
        await writeActivePresetPref({ type: "predefined", index: 0 });
      } else if (active.index > index) {
        await writeActivePresetPref({ type: "custom", index: active.index - 1 });
      }
    }
  });
}
