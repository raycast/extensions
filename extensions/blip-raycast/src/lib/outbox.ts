/**
 * Text and clipboard images have no file of their own, so we write them to a per-transfer
 * folder ("outbox") and send that file — the same thing Blip's own Paste button does.
 * Files must stay on disk until the transfer finishes, so cleanup is driven by transfer state.
 */
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, sep } from "node:path";
import { TransferStatus, type BlipState } from "./types";

const MAX_NAME_LENGTH = 128;
/** File systems allow 255 bytes (or UTF-16 units) per name; leave room for the extension and suffixes. */
const MAX_NAME_BYTES = 200;
const STAGING = "staging";
const GRACE_MS = 10 * 60 * 1000;
/** A staged clipboard image may sit in an open window for a while, possibly in another command. */
const STAGING_GRACE_MS = 24 * 60 * 60 * 1000;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

/** Mirrors Blip's naming: first 128 characters of the text, made filename-safe, plus ".txt". */
export function textFileName(text: string): string {
  const cleaned = text
    .slice(0, MAX_NAME_LENGTH * 4)
    .replace(/[\\/:*?"<>|]/g, "-")
    // eslint-disable-next-line no-control-regex -- strip control characters from filenames
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  // Slice by code points so an emoji is never cut in half, then keep within the file-name limit.
  let name = "";
  for (const char of Array.from(cleaned).slice(0, MAX_NAME_LENGTH)) {
    if (Buffer.byteLength(name + char, "utf8") > MAX_NAME_BYTES) break;
    name += char;
  }
  name = name.trim() || "Text";
  return `${WINDOWS_RESERVED.test(name) ? `${name} (text)` : name}.txt`;
}

function outboxDir(supportPath: string, transferId: string) {
  const dir = join(supportPath, "outbox", transferId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Where a clipboard image is saved while the user picks a recipient. */
export function stagingDir(supportPath: string) {
  return outboxDir(supportPath, STAGING);
}

/** Files staged by this launch. Cleanup never removes them, however long the user takes to send. */
const stagedThisLaunch = new Set<string>();

export function markStaged(path: string) {
  stagedThisLaunch.add(path);
}

/** `name` replaces the text-derived file name (used for hidden text, which must not end up in a name). */
export function writeTextFile(supportPath: string, transferId: string, text: string, name?: string): string {
  const path = join(outboxDir(supportPath, transferId), name ? textFileName(name) : textFileName(text));
  writeFileSync(path, text, "utf8");
  return path;
}

/** Gives a transfer its own copy of a staged file, so the same image can be sent more than once. */
export function copyIntoOutbox(supportPath: string, transferId: string, path: string): string {
  const target = join(outboxDir(supportPath, transferId), basename(path));
  try {
    copyFileSync(path, target);
  } catch {
    throw new Error("The copied image is no longer available. Copy it again.");
  }
  return target;
}

function isOlderThan(path: string, ms: number, now: number) {
  return now - statSync(path).mtimeMs >= ms;
}

/** Blip loads its history at launch; an empty history only means "none" once it has been up a while. */
const HISTORY_LOAD_MS = 60 * 1000;

function historyLoaded(state: BlipState, now: number) {
  if (Object.keys(state.transfers ?? {}).length) return true;
  const launched = state.launch_time ? Number(state.launch_time.seconds) * 1000 : undefined;
  return launched !== undefined && now - launched >= HISTORY_LOAD_MS;
}

/**
 * Removes outbox folders whose transfer is finished, gone or abandoned (never got past "created"),
 * and stale staged files. Everything gets a grace period, so a send in progress is never affected.
 */
export function cleanOutbox(supportPath: string, state: BlipState, now = Date.now()) {
  const root = join(supportPath, "outbox");
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return;
  }
  for (const entry of entries) {
    const dir = join(root, entry);
    try {
      if (entry === STAGING) {
        for (const item of readdirSync(dir)) {
          const path = join(dir, item);
          const inUse = [...stagedThisLaunch].some((staged) => staged === path || staged.startsWith(path + sep));
          if (!inUse && isOlderThan(path, STAGING_GRACE_MS, now)) rmSync(path, { recursive: true, force: true });
        }
        continue;
      }
      if (!isOlderThan(dir, GRACE_MS, now)) continue;
      // Blip may answer before it has loaded its history; never treat that as "every transfer is gone".
      if (!historyLoaded(state, now)) continue;
      const transfer = state.transfers?.[entry];
      const finished =
        !transfer ||
        transfer.status === TransferStatus.Completed ||
        transfer.status === TransferStatus.Cancelled ||
        transfer.status === TransferStatus.Created;
      if (finished) rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best effort.
    }
  }
}
