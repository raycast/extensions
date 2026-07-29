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
  return Number(stdout.trim());
}

interface SelectionResult {
  selection: string | null;
  clipboardOverwritten: boolean;
}

async function readSelectionViaCopy(originalText: string): Promise<SelectionResult> {
  const before = { text: originalText, changeCount: await clipboardChangeCount() };
  await runAppleScript(`tell application "System Events" to keystroke "c" using command down`);
  await new Promise((resolve) => setTimeout(resolve, COPY_DELAY_MS));
  const after = { text: (await Clipboard.read()).text, changeCount: await clipboardChangeCount() };
  return {
    selection: resolveSelectionAfterCopy(before, after),
    clipboardOverwritten: after.changeCount !== before.changeCount,
  };
}

async function readSelection(originalText: string): Promise<SelectionResult> {
  try {
    const accessibilitySelection = await getSelectedText();
    if (accessibilitySelection && isMeaningfulSelection(accessibilitySelection)) {
      return { selection: accessibilitySelection, clipboardOverwritten: false };
    }
  } catch {
    // Accessibility path failed (terminal may not expose AX selection) — fall through to keystroke fallback.
  }
  return readSelectionViaCopy(originalText);
}

export default async function main() {
  const originalClipboard = await Clipboard.read();
  const { selection, clipboardOverwritten } = await readSelection(originalClipboard.text);

  if (!selection || !isMeaningfulSelection(selection)) {
    if (clipboardOverwritten) {
      await Clipboard.copy(toRestorableContent(originalClipboard));
    }
    await showHUD("No text selected");
    return;
  }

  try {
    await Clipboard.paste(quoteText(selection));
    await new Promise((resolve) => setTimeout(resolve, PASTE_DELAY_MS));
  } finally {
    await Clipboard.copy(toRestorableContent(originalClipboard));
  }
  await showHUD("Quoted");
}
