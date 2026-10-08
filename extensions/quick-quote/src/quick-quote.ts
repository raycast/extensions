import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  ClipboardState,
  confirmCopySamples,
  isMeaningfulSelection,
  quoteText,
  resolveSelectionAfterCopy,
  toRestorableContent,
} from "./quote";

const COPY_TIMEOUT_MS = 150;
const PASTE_DELAY_MS = 200;

const execFileAsync = promisify(execFile);

function parseChangeCount(stdout: string): number {
  const count = Number(stdout.trim());
  if (!Number.isFinite(count)) {
    throw new Error("Could not read pasteboard change count");
  }
  return count;
}

async function clipboardChangeCount(): Promise<number> {
  const { stdout } = await execFileAsync("osascript", [
    "-l",
    "JavaScript",
    "-e",
    'ObjC.import("AppKit"); $.NSPasteboard.generalPasteboard.changeCount',
  ]);
  return parseChangeCount(stdout);
}

async function waitForPasteboardChange(startCount: number, timeoutMs: number): Promise<number> {
  const { stdout } = await execFileAsync("osascript", [
    "-l",
    "JavaScript",
    "-e",
    `ObjC.import("AppKit");
     const pb = $.NSPasteboard.generalPasteboard;
     const start = ${startCount};
     const deadline = Date.now() + ${timeoutMs};
     let current = Number(pb.changeCount);
     while (current === start && Date.now() < deadline) {
       $.NSThread.sleepForTimeInterval(0.01);
       current = Number(pb.changeCount);
     }
     current;`,
  ]);
  return parseChangeCount(stdout);
}

async function probeCopy(baseline: ClipboardState): Promise<string | null> {
  await runAppleScript(`tell application "System Events" to keystroke "c" using command down`);
  await waitForPasteboardChange(baseline.changeCount, COPY_TIMEOUT_MS);
  const after = { text: (await Clipboard.read()).text, changeCount: await clipboardChangeCount() };
  return resolveSelectionAfterCopy(baseline, after);
}

async function readSelectionViaCopy(originalText: string): Promise<string | null> {
  const first = await probeCopy({ text: originalText, changeCount: await clipboardChangeCount() });
  if (first == null) return null;
  const second = await probeCopy({ text: first, changeCount: await clipboardChangeCount() });
  return confirmCopySamples(first, second);
}

async function readSelection(originalText: string): Promise<string | null> {
  try {
    const accessibilitySelection = await getSelectedText();
    if (accessibilitySelection && isMeaningfulSelection(accessibilitySelection)) {
      return accessibilitySelection;
    }
  } catch {
    // Accessibility path failed (terminal may not expose AX selection) — fall through to keystroke fallback.
  }
  return readSelectionViaCopy(originalText);
}

export default async function main() {
  const originalClipboard = await Clipboard.read();
  let didQuote = false;

  // Always restore once we have a snapshot. The Cmd+C fallback can overwrite the
  // pasteboard and then throw on the post-copy probe, which would otherwise leave
  // the user's clipboard as the raw selection.
  try {
    try {
      const selection = await readSelection(originalClipboard.text);

      if (!selection || !isMeaningfulSelection(selection)) {
        await showHUD("No text selected");
        return;
      }

      await Clipboard.paste(quoteText(selection));
      await new Promise((resolve) => setTimeout(resolve, PASTE_DELAY_MS));
      didQuote = true;
    } finally {
      await Clipboard.copy(toRestorableContent(originalClipboard));
    }
  } catch {
    await showHUD("Couldn't quote selection");
    return;
  }

  if (didQuote) {
    await showHUD("Quoted");
  }
}
