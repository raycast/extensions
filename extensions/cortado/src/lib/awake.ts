import { LaunchType, launchCommand } from "@raycast/api";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export enum AwakeMode {
  Off = 0,
  Indefinite = 1,
  Timed = 2,
  Expirable = 3,
}

export interface AwakeProperties {
  keepDisplayOn: boolean;
  mode: number;
  intervalHours: number;
  intervalMinutes: number;
  expirationDateTime: string;
  customTrayTimes: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AwakeSettingsFile {
  properties: AwakeProperties;
  name: string;
  version: string;
  [key: string]: unknown;
}

interface GeneralSettingsFile {
  enabled?: Record<string, boolean>;
  [key: string]: unknown;
}

/**
 * `process.env.LOCALAPPDATA` isn't reliably present in the Node process
 * Raycast for Windows spawns to run extension commands — confirmed via
 * diagnostic logging inside a real Raycast-launched process, where it came
 * back `undefined` (and `process.cwd()` was `C:\WINDOWS\system32`, not the
 * extension directory), consistently across five separate invocations.
 * `os.homedir()` resolves via the Win32 user-profile API rather than
 * reading an env var, so it isn't affected by whatever strips the env
 * block. Prefer the env var when it *is* present, since it's the
 * authoritative source if a user has redirected AppData; fall back to the
 * homedir-derived default otherwise.
 */
function powerToysDataDir(): string {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return path.join(localAppData, "Microsoft", "PowerToys");
}

function getAwakeSettingsPath(): string {
  return path.join(powerToysDataDir(), "Awake", "settings.json");
}

function getGeneralSettingsPath(): string {
  return path.join(powerToysDataDir(), "settings.json");
}

function isAwakeProperties(value: unknown): value is AwakeProperties {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const p = value as Record<string, unknown>;
  return (
    typeof p.mode === "number" &&
    typeof p.keepDisplayOn === "boolean" &&
    typeof p.intervalHours === "number" &&
    typeof p.intervalMinutes === "number" &&
    typeof p.expirationDateTime === "string"
  );
}

function isAwakeSettingsFile(value: unknown): value is AwakeSettingsFile {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return isAwakeProperties((value as Record<string, unknown>).properties);
}

/**
 * Reads and validates Awake's settings.json. Throws rather than returning a
 * partial/guessed result, since callers must never write on top of a file
 * they couldn't confirm the shape of.
 */
export function readAwakeSettings(): AwakeSettingsFile {
  const filePath = getAwakeSettingsPath();
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("PowerToys Awake hasn't been run yet. Open PowerToys Settings → Awake once, then try again.");
    }
    throw new Error(`Couldn't read PowerToys Awake's settings at ${filePath}: ${(error as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`PowerToys Awake's settings file isn't valid JSON: ${filePath}`);
  }

  if (!isAwakeSettingsFile(parsed)) {
    throw new Error(
      "PowerToys Awake's settings file doesn't look the way Cortado expects, so nothing was changed. Open PowerToys Settings → Awake to repair it.",
    );
  }

  return parsed;
}

/**
 * Merges `patch` into the current properties and writes the whole object
 * back in a single in-place write, then re-reads to confirm the mode took.
 *
 * This must stay a single `writeFileSync` to the real path, not a
 * temp-file-then-rename: empirically, Awake's FileSystemWatcher only reacts
 * to in-place writes to the existing file. A rename-based replace (verified
 * with `File.Move(tmp, target, overwrite: true)`) was never picked up, even
 * after 30+ seconds, while direct in-place writes were picked up in
 * single-digit milliseconds every time. For a ~200 byte file the crash-safety
 * margin rename would buy isn't worth losing that.
 *
 * The re-read-after-write matters because Awake mutates this file on its
 * own: when a Timed or Expirable session's internal timer elapses, Awake
 * writes `mode: 0` back into the file itself (leaving `intervalMinutes` /
 * `expirationDateTime` stale). So the file can change out from under a
 * caller for reasons that have nothing to do with this extension.
 */
const CONCURRENT_CHANGE_MESSAGE =
  "The change didn't take. PowerToys Awake's settings changed underneath it, so try again.";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function writeAwakeSettings(current: AwakeSettingsFile, patch: Partial<AwakeProperties>): Promise<void> {
  const next: AwakeSettingsFile = {
    ...current,
    properties: {
      ...current.properties,
      ...patch,
    },
  };

  const json = JSON.stringify(next);
  const filePath = getAwakeSettingsPath();

  // The PowerToys Settings UI or Awake itself can briefly hold this file
  // open at the moment we write; on Windows that surfaces as a transient
  // EPERM/EBUSY sharing violation, not a persistent failure. One short
  // bounded retry turns that race into a non-event. Anything else (EACCES
  // from real permissions, ENOSPC, …) fails immediately.
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      fs.writeFileSync(filePath, json, "utf8");
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error as Error;
      const code = (error as NodeJS.ErrnoException).code;
      if ((code === "EPERM" || code === "EBUSY") && attempt < 2) {
        await sleep(50);
        continue;
      }
      break;
    }
  }
  if (lastError) {
    throw new Error(`Couldn't update PowerToys Awake's settings: ${lastError.message}`);
  }

  // Verify the write took. If the re-read itself fails (e.g. a torn read
  // because another writer landed mid-verify), report it as the concurrent
  // change it is — Cortado's own write succeeded, so "file is broken" would
  // be misleading.
  //
  // Mode alone isn't enough: two overlapping Expirable writes both land
  // mode 3, so a mode-only check would let the loser report success after
  // the winner replaced its `expirationDateTime`/`keepDisplayOn`. But the
  // stricter fields can't be compared as raw strings either — Awake
  // normalizes timestamps when it rewrites the file (e.g. trims trailing
  // zeros in the fractional seconds), so a byte-for-byte match would
  // false-fail against Awake's own harmless rewrite. Hence:
  //  - `mode` and `keepDisplayOn`: exact.
  //  - `expirationDateTime`: parsed to an instant and compared with a small
  //    tolerance, and only when the mode just written is Expirable — outside
  //    that mode the field is stale by Awake's own contract (Awake leaves it
  //    behind when it expires a session) and mustn't be read.
  let confirmed: AwakeSettingsFile;
  try {
    confirmed = readAwakeSettings();
  } catch {
    throw new Error(CONCURRENT_CHANGE_MESSAGE);
  }
  if (
    confirmed.properties.mode !== next.properties.mode ||
    confirmed.properties.keepDisplayOn !== next.properties.keepDisplayOn
  ) {
    throw new Error(CONCURRENT_CHANGE_MESSAGE);
  }
  if (next.properties.mode === AwakeMode.Expirable) {
    const wroteMs = new Date(next.properties.expirationDateTime).getTime();
    const confirmedMs = new Date(confirmed.properties.expirationDateTime).getTime();
    // If what we wrote isn't JS-parseable there's no instant to verify
    // against, so skip (Cortado's own timestamps always parse). If ours
    // parses but the file's no longer does, another writer replaced it.
    if (Number.isFinite(wroteMs) && (!Number.isFinite(confirmedMs) || Math.abs(confirmedMs - wroteMs) > 2_000)) {
      throw new Error(CONCURRENT_CHANGE_MESSAGE);
    }
  }
}

function assertAwakeModuleEnabled(): void {
  const filePath = getGeneralSettingsPath();

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("PowerToys doesn't appear to be installed. Install it and enable Awake, then try again.");
    }
    throw new Error(`Couldn't read PowerToys settings at ${filePath}: ${(error as Error).message}`);
  }

  let parsed: GeneralSettingsFile;
  try {
    parsed = JSON.parse(raw) as GeneralSettingsFile;
  } catch {
    throw new Error(`PowerToys settings file isn't valid JSON: ${filePath}`);
  }

  if (parsed.enabled?.Awake !== true) {
    throw new Error("PowerToys Awake is disabled. Enable it in PowerToys Settings → Awake, then try again.");
  }
}

/**
 * Resolved by absolute path rather than left to PATH lookup: the same
 * diagnostic session that found `LOCALAPPDATA` missing also found
 * `process.cwd()` was `C:\WINDOWS\system32` inside Raycast's extension host,
 * meaning this process's environment isn't a normal inherited shell
 * environment — PATH resolution for a bare `"tasklist"` shouldn't be trusted
 * either. `SystemRoot` is checked first in case Windows is installed to a
 * non-default drive/path, with a literal fallback since even that env var
 * could plausibly be stripped the same way `LOCALAPPDATA` was.
 */
function tasklistPath(): string {
  const systemRoot = process.env.SystemRoot || "C:\\Windows";
  return path.join(systemRoot, "System32", "tasklist.exe");
}

function assertAwakeProcessRunning(): void {
  let output: string;
  try {
    output = execFileSync(tasklistPath(), ["/FI", "IMAGENAME eq PowerToys.Awake.exe", "/NH"], {
      encoding: "utf8",
    });
  } catch (error) {
    throw new Error(`Couldn't check whether PowerToys.Awake.exe is running: ${(error as Error).message}`);
  }

  if (!output.toLowerCase().includes("powertoys.awake.exe")) {
    throw new Error("PowerToys.Awake.exe isn't running. Open PowerToys Settings → Awake to start it.");
  }
}

/**
 * Guards every read/write path. Never attempts to flip the module's
 * `enabled` flag itself — that goes through Runner's own IPC, not a watched
 * file, and isn't safe to assume file-editable.
 *
 * The checks throw distinct, specific messages on purpose: "settings file
 * couldn't be read/parsed" is a different problem (and a different fix) from
 * "module is disabled" or "process isn't running," and collapsing them into
 * one generic message hid the real cause the first time around.
 *
 * `checkProcess` defaults to true (full check, used by every write and by
 * user-initiated status checks). Background-refresh ticks pass `false`:
 * `assertAwakeProcessRunning` is the one expensive check here (it shells out
 * to `tasklist`), while `assertAwakeModuleEnabled` and `readAwakeSettings`
 * are both single small JSON reads, cheap enough to run on every tick. This
 * trades a small amount of staleness (a background tick can't distinguish
 * "module enabled but the process crashed" from "genuinely awake") for
 * avoiding a process spawn as often as every 10–60 seconds all day. The next
 * real write (Toggle/Keep Awake for…) always re-runs the full check, so this
 * staleness never affects correctness of an actual keep-awake action — only
 * how quickly the passive status display notices a crashed process.
 */
export function ensureAwakeAvailable(options: { checkProcess?: boolean } = {}): void {
  assertAwakeModuleEnabled();
  if (options.checkProcess !== false) {
    assertAwakeProcessRunning();
  }
}

/**
 * Converts a duration into the absolute instant Awake should stop at,
 * serialized as LOCAL time with the local UTC offset (e.g.
 * `2026-07-23T02:41:58.094-04:00`), matching Awake's own serialization.
 *
 * This must NOT be `Date#toISOString()` (`Z`-suffixed UTC). Awake parses a
 * UTC timestamp to the correct absolute instant — the internal countdown
 * fires at the right moment either way, verified live — but it *displays*
 * the timestamp in whatever offset the string carries, without converting
 * to local (its log renders e.g. "6:41:58 AM +00:00" verbatim). A UTC
 * string therefore makes the tray tooltip / Settings UI show an end time
 * hours off from the user's wall clock: a 1-hour session written under
 * EDT (UTC-4) displayed as ending 5 hours from now. Found the hard way in
 * live testing.
 *
 * The offset is computed at the TARGET instant, not "now": for a session
 * that spans a DST transition, `getTimezoneOffset()` on the target Date
 * returns the offset in effect when the session ends, so the encoded
 * instant stays exact and the displayed wall-clock time is the one the
 * user's clock will actually show at expiry.
 */
export function minutesFromNowToAwakeTimestamp(totalMinutes: number): string {
  const d = new Date(Date.now() + totalMinutes * 60_000);
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  // getTimezoneOffset() is minutes to ADD to local time to reach UTC, so
  // its sign is inverted relative to the "+04:00"-style suffix.
  const offsetMinutes = -d.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}` +
    `${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`
  );
}

/**
 * The label shown when `ensureAwakeAvailable` fails — PowerToys missing,
 * Awake disabled, process not running, or (for a background tick) not yet
 * confirmed. Exported so every command uses the exact same word.
 */
export const UNAVAILABLE_LABEL = "Unavailable";

/**
 * Fixed title for every failure toast across the extension. The title names
 * the source (this extension), the message carries the specific, actionable
 * problem — a title like "Couldn't toggle Awake" reads as ambiguous about
 * whether the fault is Cortado's or PowerToys Awake's own.
 */
export const TOAST_TITLE = "Cortado";

function formatHoursMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}m`);
  }
  return parts.join(" ");
}

/**
 * Single source of truth for state text: the same strings are used as HUD
 * text, toast titles, and the background-refreshed subtitle, so the same
 * word for a given state always appears everywhere it's shown.
 *
 * Derives status from `mode` alone. `intervalHours`/`intervalMinutes`/
 * `expirationDateTime` are only meaningful while `mode` is Timed or
 * Expirable — after a Timed/Expirable session ends, Awake reverts `mode` to
 * 0 but leaves those fields holding stale values from the last session, so
 * they must never be read outside their owning mode.
 *
 * Cortado itself only ever writes mode 3 (Expirable) for a timed session —
 * `expirationDateTime` is an absolute instant, so remaining time is a pure
 * function of `expirationDateTime - now`, correct no matter who wrote the
 * file or what timezone/offset it was written under (`new Date(isoString)`
 * parses the embedded offset into an absolute instant; arithmetic against
 * `Date.now()` is instant-vs-instant the whole way, so neither the file's
 * offset, the machine's current offset, nor a DST transition in between can
 * skew it — verified directly against the real file, including with a
 * file-embedded offset deliberately different from the machine's current
 * one). Mode 2
 * (Timed) can still appear from PowerToys' own tray "keep awake temporarily"
 * presets, which write mode 2 with no absolute end time recorded anywhere —
 * Awake tracks that countdown only in its own process memory, never in the
 * file — so a mode-2 session's true remaining time is fundamentally
 * unrecoverable here. That's degraded to an honest, numberless label rather
 * than showing the static configured duration mislabeled as "remaining."
 */
export function statusLabel(properties: AwakeProperties): string {
  const mode = properties.mode as AwakeMode;

  switch (mode) {
    case AwakeMode.Off:
      return "Off";
    case AwakeMode.Indefinite:
      return "Awake";
    case AwakeMode.Timed:
      return "Awake · timed";
    case AwakeMode.Expirable: {
      const remainingMs = new Date(properties.expirationDateTime).getTime() - Date.now();
      // A mode-3 expirationDateTime written by another tool can be in a
      // format .NET parses but JS doesn't; NaN here would otherwise render
      // as "Awake · NaNm left". Degrade to the same honest, numberless
      // label used for untracked timed sessions.
      if (!Number.isFinite(remainingMs)) {
        return "Awake · timed";
      }
      // Ceiling, clamped to a 1-minute floor: never shows "0m left," and the
      // whole final minute (including if this races Awake's own internal
      // expiry and briefly sees a negative remainder) reads as "1m left"
      // rather than a negative or nonsensical duration. The next tick after
      // Awake actually flips `mode` to 0 reads as "Off" — no state in
      // between renders anything incoherent.
      const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
      return `Awake · ${formatHoursMinutes(totalMinutes)} left`;
    }
    default:
      return UNAVAILABLE_LABEL;
  }
}

/**
 * Nudges Awake Status to refresh its subtitle right after a write, instead
 * of waiting up to a full interval for the next background tick. Background
 * refresh is opt-in per install (it only activates once the user has opened
 * Awake Status, or enabled it in that command's preferences), so on a fresh
 * install this can throw — that must never surface as a failure on an
 * otherwise successful write.
 */
export async function nudgeStatus(): Promise<void> {
  try {
    await launchCommand({ name: "awake-status", type: LaunchType.Background });
  } catch {
    // Status refresh isn't enabled yet; the write itself still succeeded.
  }
}
