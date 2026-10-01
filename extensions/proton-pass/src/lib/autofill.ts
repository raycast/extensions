import { Clipboard, PopToRootType, closeMainWindow, popToRoot, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { KeyCode, KeyModifier, isPermissionError, keyPressScript } from "./key-press";

/** Time for the previous app to get the focus back once Raycast closes. */
const FOCUS_DELAY_MS = 250;
/** Time for the app to read the clipboard after ⌘V, before the clipboard changes again. */
const PASTE_DELAY_MS = 300;

/** Filling relies on AppleScript, so it is only offered on macOS. */
export const canFillFrontmostApp = process.platform === "darwin";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pressKey(keyCode: number, modifiers?: KeyModifier[]): Promise<void> {
  await runAppleScript(keyPressScript(keyCode, modifiers));
}

async function restoreClipboard(previous: Clipboard.ReadContent): Promise<void> {
  if (previous.file) await Clipboard.copy({ file: previous.file });
  else if (previous.html) await Clipboard.copy({ html: previous.html, text: previous.text });
  else if (previous.text) await Clipboard.copy({ text: previous.text });
  else await Clipboard.clear();
}

export interface FillRequest {
  /** Pasted one after the other, with Tab in between to move to the next field. */
  values: string[];
  /** Press Return after the last value. */
  submit?: boolean;
  /** Value to leave in the clipboard afterwards, such as a 2FA code. Otherwise the previous clipboard is restored. */
  getClipboardValue?: () => Promise<string | undefined>;
  /** HUD shown when a value is left in the clipboard. */
  clipboardValueHud?: string;
}

/**
 * Closes Raycast and pastes values into the app that was in front of it. Values go through the clipboard
 * marked as concealed, so clipboard history doesn't record them, and are replaced right after.
 */
export async function fillFrontmostApp({
  values,
  submit = false,
  getClipboardValue,
  clipboardValueHud,
}: FillRequest): Promise<void> {
  const previousClipboard = await Clipboard.read();
  // Keep the command running while filling; it goes back to the root search at the end.
  await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Suspended });
  await wait(FOCUS_DELAY_MS);

  try {
    for (const [index, value] of values.entries()) {
      if (index > 0) await pressKey(KeyCode.Tab);
      await Clipboard.copy(value, { concealed: true });
      await pressKey(KeyCode.V, ["command"]);
      await wait(PASTE_DELAY_MS);
    }
    if (submit) await pressKey(KeyCode.Return);

    const clipboardValue = await getClipboardValue?.().catch(() => undefined);
    if (clipboardValue) {
      await Clipboard.copy(clipboardValue, { concealed: true });
      if (clipboardValueHud) await showHUD(clipboardValueHud);
    } else {
      await restoreClipboard(previousClipboard);
    }
  } catch (error: unknown) {
    await restoreClipboard(previousClipboard);
    const message = error instanceof Error ? error.message : String(error);
    await showHUD(
      isPermissionError(message)
        ? "Allow Raycast in System Settings › Privacy & Security › Accessibility and Automation"
        : "Couldn't fill the login",
    );
  } finally {
    await popToRoot({ clearSearchBar: true });
  }
}
