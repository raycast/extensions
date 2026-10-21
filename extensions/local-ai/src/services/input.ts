import { Clipboard, getSelectedText } from "@raycast/api";
import { execFile } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import type { RunInput } from "../lib/launch-context";
import { pollForText } from "../lib/poll";
import { resolveInput } from "../lib/run-request";
import { restoreClipboard } from "./clipboard";
import { getSettings } from "./settings";

const execFileAsync = promisify(execFile);

const COPY_POLL_INTERVAL_MS = 25;
const COPY_POLL_TIMEOUT_MS = 500;
const COPY_KEYSTROKE_SCRIPT = 'tell application "System Events" to keystroke "c" using command down';

export async function readSelection(): Promise<string | undefined> {
  try {
    return await getSelectedText();
  } catch {
    return getSettings().copySelectionFallback ? await copySelection() : undefined;
  }
}

export async function captureInput(): Promise<RunInput | undefined> {
  const selection = await readSelection();
  if (selection?.trim()) return resolveInput(selection, undefined);
  return resolveInput(selection, await Clipboard.readText());
}

async function copySelection(): Promise<string | undefined> {
  const previous = await Clipboard.read();
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
