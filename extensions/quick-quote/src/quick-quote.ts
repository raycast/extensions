import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile } from "child_process";
import { promisify } from "util";
import { isMeaningfulSelection, quoteText, resolveSelectionAfterCopy, toRestorableContent } from "./quote";

const COPY_DELAY_MS = 150;
const PASTE_DELAY_MS = 200;

const execFileAsync = promisify(execFile);

async function clipboardChangeCount(): Promise<number> {
  const { stdout } = await execFileAsync("osascript", [
    "-l",
    "JavaScript",
    "-e",
    'ObjC.import("AppKit"); $.NSPasteboard.generalPasteboard.changeCount',
  ]);
  const count = Number(stdout.trim());
  if (!Number.isFinite(count)) {
    throw new Error("Could not read pasteboard change count");
  }
  return count;
}

async function readSelectionViaCopy(originalText: string): Promise<string | null> {
  const before = { text: originalText, changeCount: await clipboardChangeCount() };
  await runAppleScript(`tell application "System Events" to keystroke "c" using command down`);
  await new Promise((resolve) => setTimeout(resolve, COPY_DELAY_MS));
  const after = { text: (await Clipboard.read()).text, changeCount: await clipboardChangeCount() };
  return resolveSelectionAfterCopy(before, after);
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
