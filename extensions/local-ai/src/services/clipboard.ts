import { Clipboard } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { clipboardRestoreContent, isClipboardInfoEmpty, isRestorable, restoreAction } from "../lib/replace";
import type { ClipboardSnapshot } from "../lib/replace";

const execFileAsync = promisify(execFile);

const CLIPBOARD_INFO_SCRIPT = "clipboard info";

export interface SavedClipboard {
  snapshot: ClipboardSnapshot;
  wasEmpty: boolean;
}

export async function saveClipboard(): Promise<SavedClipboard> {
  const snapshot = await Clipboard.read();
  return { snapshot, wasEmpty: !isRestorable(snapshot) && (await isClipboardEmpty()) };
}

export async function restoreClipboard({ snapshot, wasEmpty }: SavedClipboard): Promise<void> {
  const action = restoreAction(snapshot, wasEmpty);
  if (action === "clear") return await Clipboard.clear();
  const content = clipboardRestoreContent(snapshot);
  if (action === "restore" && content) await Clipboard.copy(content, { concealed: true });
}

async function isClipboardEmpty(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", CLIPBOARD_INFO_SCRIPT]);
    return isClipboardInfoEmpty(stdout);
  } catch {
    return false;
  }
}
