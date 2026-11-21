// =============================================================================
// BETTERDISPLAYCLI
// Low-level `betterdisplaycli` invocation used only by the mirror fix.
// -----------------------------------------------------------------------------
// Context: The Fix Mirroring mechanism (virtualscreens.ts) is the only thing
//   that shells out to this binary. This holds
//   the one exec primitive, the reject-vs-break distinction, and the main-display
//   parser, so neither reinvents them.
// NOTE: Arguments go through execFile (never a shell string), so display names
//   containing quotes or apostrophes are safe.
// =============================================================================

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { SidecarError } from "./backend";

const execFileAsync = promisify(execFile);

// A healthy read answers in ~0.13s (measured). Writes can legitimately take a
// while as macOS rearranges displays, so they keep the generous budget.
//
// WARN: These MUST differ. `betterdisplaycli` is a one-line wrapper that execs the
//   whole BetterDisplay app binary, and when the app is not running the call
//   blocks until it gives up — measured at 16s. Applying the write budget to
//   status reads meant a background tick polling every minute could not finish one
//   render inside its own interval, so renders piled up and cold-launched the app
//   binary continuously.
const READ_TIMEOUT_MS = 3_000;
const WRITE_TIMEOUT_MS = 15_000;
const FAILURE_MARKER = "Failed.";
const GROUP_TYPE = "DisplayGroup";

/** A display or virtual screen as reported by `get --identifiers`. */
export interface Device {
  readonly uuid: string;
  readonly name: string;
  readonly deviceType: string;
}

/** An identifier entry as BetterDisplay spells it, before normalisation. */
interface RawDevice {
  readonly UUID: string;
  readonly name: string;
  readonly deviceType: string;
}

// -----------------------------------------------------------
// INVOCATION
// -----------------------------------------------------------

/**
 * Extracts a human-readable detail from whatever execFile rejected with.
 *
 * @param cause - The rejection value.
 * @returns The error message, or its string form.
 */
function detailOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * True when the CLI rejected the request rather than failing to run.
 *
 * @param cause - Whatever execFile rejected with.
 * @returns True if BetterDisplay printed its `Failed.` marker on stderr.
 *
 * NOTE: A rejected request exits 1 with `Failed.` on stderr and empty stdout.
 *   A missing binary or a stopped app fails differently, and must not be
 *   mistaken for "the display you asked about does not exist".
 */
function isRejection(cause: unknown): boolean {
  if (typeof cause !== "object" || cause === null) {
    return false;
  }
  const stderr = (cause as { stderr?: unknown }).stderr;
  return typeof stderr === "string" && stderr.trim().startsWith(FAILURE_MARKER);
}

/**
 * Runs the CLI, resolving trimmed stdout and rejecting with the raw cause.
 *
 * @param cliPath - Absolute path to the `betterdisplaycli` binary.
 * @param args    - Operation and parameters, one array element each.
 * @param timeout - Milliseconds before the call is abandoned.
 * @returns Trimmed stdout.
 */
async function exec(cliPath: string, args: readonly string[], timeout: number): Promise<string> {
  const { stdout } = await execFileAsync(cliPath, [...args], { timeout });
  return stdout.trim();
}

/**
 * Invokes the CLI for a write, throwing when it fails or is rejected.
 *
 * @param cliPath - Path to the `betterdisplaycli` binary.
 * @param args    - Operation and parameters.
 *
 * WARN: Writes must never swallow a rejection, or a failed `set` would look like
 *   a display change that merely has not settled yet.
 */
export async function writeCli(cliPath: string, args: readonly string[]): Promise<void> {
  try {
    await exec(cliPath, args, WRITE_TIMEOUT_MS);
  } catch (cause) {
    throw new SidecarError(`betterdisplaycli ${args.join(" ")} failed: ${detailOf(cause)}`);
  }
}

/**
 * Invokes the CLI for a read, distinguishing rejection from breakage.
 *
 * @param cliPath - Path to the `betterdisplaycli` binary.
 * @param args    - Operation and parameters.
 * @returns Trimmed stdout, or null when BetterDisplay rejected the request.
 */
export async function readCli(cliPath: string, args: readonly string[]): Promise<string | null> {
  try {
    return await exec(cliPath, args, READ_TIMEOUT_MS);
  } catch (cause) {
    if (isRejection(cause)) {
      return null;
    }
    throw new SidecarError(`betterdisplaycli ${args.join(" ")} failed: ${detailOf(cause)}`);
  }
}

/**
 * Invokes the CLI for a read leniently, treating any failure as "no value".
 *
 * @param cliPath - Path to the `betterdisplaycli` binary.
 * @param args    - Operation and parameters.
 * @returns Trimmed stdout, or null on any failure.
 *
 * NOTE: For callers that only need a best-effort read and have a safe fallback
 *   when it is absent — a broken CLI still surfaces via the write that follows.
 */
export async function tryReadCli(cliPath: string, args: readonly string[]): Promise<string | null> {
  try {
    return await exec(cliPath, args, READ_TIMEOUT_MS);
  } catch {
    return null;
  }
}

// -----------------------------------------------------------
// PARSING
// -----------------------------------------------------------

/**
 * Narrows one parsed identifier entry to a RawDevice.
 *
 * @param value - Entry from the identifier list.
 * @returns True when the entry carries the three fields we rely on.
 */
function isRawDevice(value: unknown): value is RawDevice {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return typeof entry.UUID === "string" && typeof entry.name === "string" && typeof entry.deviceType === "string";
}

/**
 * Parses the display macOS treats as main from a `--displayWithMainStatus
 * --identifiers` read.
 *
 * @param raw - Raw stdout: a single pseudo-JSON object with no array wrapper.
 * @returns The main display, or null when absent, empty, or unparseable.
 */
export function parseMainDisplay(raw: string | null): Device | null {
  if (raw === null || raw === "") {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(`[${raw}]`);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) {
    return null;
  }

  const device = parsed.filter(isRawDevice).find((entry) => entry.deviceType !== GROUP_TYPE);
  return device ? { uuid: device.UUID, name: device.name, deviceType: device.deviceType } : null;
}
