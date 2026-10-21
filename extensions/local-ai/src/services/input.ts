import { Clipboard, getSelectedText } from "@raycast/api";
import { execFile } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import type { RunInput } from "../lib/launch-context";
import { pollForText } from "../lib/poll";
import { isClipboardInfoEmpty, isRestorable } from "../lib/replace";
import { resolveInput } from "../lib/run-request";
import { restoreClipboard } from "./clipboard";
import { getSettings } from "./settings";

const execFileAsync = promisify(execFile);

const COPY_POLL_INTERVAL_MS = 25;
const COPY_POLL_TIMEOUT_MS = 500;
const CLIPBOARD_INFO_SCRIPT = "clipboard info";
const COPY_KEYSTROKE_SCRIPT = 'tell application "System Events" to keystroke "c" using command down';

interface CaptureOptions {
  allowCopyFallback?: boolean;
}

export async function readSelection({ allowCopyFallback = false }: CaptureOptions = {}): Promise<string | undefined> {
  try {
    return await getSelectedText();
  } catch {
    return allowCopyFallback && getSettings().copySelectionFallback ? await copySelection() : undefined;
  }
}

export async function captureInput(options: CaptureOptions = {}): Promise<RunInput | undefined> {
  const selection = await readSelection(options);
  if (selection?.trim()) return resolveInput(selection, undefined);
  return resolveInput(selection, await Clipboard.readText());
}

async function copySelection(): Promise<string | undefined> {
  const previous = await Clipboard.read();
  if (!isRestorable(previous) && !(await isClipboardEmpty())) return undefined;
  try {
    await Clipboard.clear();
    await execFileAsync("/usr/bin/osascript", ["-e", COPY_KEYSTROKE_SCRIPT]);
    return await pollForText(() => Clipboard.readText(), {
      intervalMs: COPY_POLL_INTERVAL_MS,
      timeoutMs: COPY_POLL_TIMEOUT_MS,
      sleep: (ms) => delay(ms),
    });
  } catch {
    return undefined;
  } finally {
    await restoreClipboard(previous);
  }
}

async function isClipboardEmpty(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", CLIPBOARD_INFO_SCRIPT]);
    return isClipboardInfoEmpty(stdout);
  } catch {
    return false;
  }
}
