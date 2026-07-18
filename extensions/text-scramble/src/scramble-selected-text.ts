import { Clipboard, getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { canSafelyRestoreClipboard } from "./clipboard-safety";
import { scrambleText } from "./scramble-text";

class NoTextError extends Error {
  constructor() {
    super("No text available");
    Object.setPrototypeOf(this, NoTextError.prototype);
  }
}

class SelectionUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Selected text is unavailable", { cause });
    Object.setPrototypeOf(this, SelectionUnavailableError.prototype);
  }
}

class ClipboardProtectionError extends Error {
  constructor() {
    super("Clipboard content cannot be restored safely");
    Object.setPrototypeOf(this, ClipboardProtectionError.prototype);
  }
}

async function readClipboard(): Promise<string> {
  try {
    return (await Clipboard.readText()) ?? "";
  } catch {
    return "";
  }
}

async function readText(preferredSource: Preferences.ScrambleSelectedText["source"]): Promise<string> {
  if (preferredSource === "selected") {
    try {
      const selected = await getSelectedText();
      if (selected.trim()) return selected;
    } catch (error) {
      throw new SelectionUnavailableError(error);
    }

    const clipboard = await readClipboard();
    if (clipboard.trim()) return clipboard;
    throw new NoTextError();
  }

  const clipboard = await readClipboard();
  if (clipboard.trim()) return clipboard;

  try {
    const selected = await getSelectedText();
    if (selected.trim()) return selected;
  } catch {
    // A failed fallback must not hide the useful "no text" message.
  }

  throw new NoTextError();
}

async function restoreClipboard(content: Clipboard.ReadContent): Promise<void> {
  if (content.file) {
    await Clipboard.copy({ file: content.file });
  } else if (content.html) {
    await Clipboard.copy({ html: content.html, text: content.text });
  } else {
    await Clipboard.copy(content.text);
  }
}

async function pasteWithoutChangingClipboard(text: string): Promise<void> {
  const previousClipboard = await Clipboard.read();
  if (!canSafelyRestoreClipboard(previousClipboard)) throw new ClipboardProtectionError();

  try {
    await Clipboard.paste(text);
  } finally {
    await restoreClipboard(previousClipboard);
  }
}

export default async function Command(): Promise<void> {
  const preferences = getPreferenceValues<Preferences.ScrambleSelectedText>();

  try {
    const source = await readText(preferences.source);
    const scrambled = scrambleText(source, { scrambleNumbers: preferences.scrambleNumbers });

    if (scrambled === source) {
      await showHUD("Nothing to scramble");
      return;
    }

    if (preferences.action === "copy") {
      await Clipboard.copy(scrambled);
      await showHUD("Scrambled text copied");
      return;
    }

    await pasteWithoutChangingClipboard(scrambled);
    await showHUD("Text scrambled");
  } catch (error) {
    if (error instanceof ClipboardProtectionError) {
      await showHUD("Rich clipboard protected — save it, then retry");
      return;
    }

    if (error instanceof SelectionUnavailableError) {
      await showHUD("Can’t read selected text — select text or choose Clipboard");
      return;
    }

    if (error instanceof NoTextError) {
      await showHUD("No text — select or copy something first");
      return;
    }

    console.error("Failed to scramble text", error);
    await showHUD("Couldn’t scramble text");
  }
}
