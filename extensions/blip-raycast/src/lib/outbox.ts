/**
 * Text and clipboard images have no file of their own, so we write them to a per-transfer
 * folder ("outbox") and send that file — the same thing Blip's own Paste button does.
 * Files must stay on disk until the transfer finishes, so cleanup is driven by transfer state.
 */
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TransferStatus, type BlipState } from "./types";

const MAX_NAME_LENGTH = 128;

/** Mirrors Blip's naming: first 128 characters of the text, made filename-safe, plus ".txt". */
export function textFileName(text: string): string {
  const cleaned = text
    .replace(/[\\/:*?"<>|]/g, "-")
    // eslint-disable-next-line no-control-regex -- strip control characters from filenames
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  return `${cleaned || "Text"}.txt`;
}

export function outboxDir(supportPath: string, transferId: string) {
  const dir = join(supportPath, "outbox", transferId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeTextFile(supportPath: string, transferId: string, text: string): string {
  const path = join(outboxDir(supportPath, transferId), textFileName(text));
  writeFileSync(path, text, "utf8");
  return path;
}

const GRACE_MS = 10 * 60 * 1000;

/** Removes outbox folders whose transfer is finished or gone (after a grace period). */
export function cleanOutbox(supportPath: string, state: BlipState, now = Date.now()) {
  const root = join(supportPath, "outbox");
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return;
  }
  for (const transferId of entries) {
    const dir = join(root, transferId);
    try {
      if (now - statSync(dir).mtimeMs < GRACE_MS) continue;
      const transfer = state.transfers[transferId];
      const finished =
        !transfer || transfer.status === TransferStatus.Completed || transfer.status === TransferStatus.Cancelled;
      if (finished) rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best effort.
    }
  }
}
