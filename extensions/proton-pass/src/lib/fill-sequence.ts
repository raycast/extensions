import { KeyCode, KeyModifier, isPermissionError } from "./key-press";

/** Clipboard contents to restore after filling. */
export interface ClipboardSnapshot {
  text?: string;
  html?: string;
  file?: string;
}

/** What filling needs from the system; autofill.ts implements it with Raycast and AppleScript. */
export interface FillDriver {
  readClipboard(): Promise<ClipboardSnapshot>;
  restoreClipboard(snapshot: ClipboardSnapshot): Promise<void>;
  /** Copies a value marked as concealed, so that clipboard history skips it. */
  copyConcealed(value: string): Promise<void>;
  pressKey(keyCode: number, modifiers?: KeyModifier[]): Promise<void>;
  /** Closes Raycast and resolves once the app that was in front of it has the focus back. */
  returnToPreviousApp(): Promise<void>;
  wait(ms: number): Promise<void>;
  showHud(message: string): Promise<void>;
  /** Called last, whatever happened. */
  finish(): Promise<void>;
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

/** Time for the app to read the clipboard after ⌘V, before the clipboard changes again. */
export const PASTE_DELAY_MS = 300;
export const PERMISSION_HUD = "Allow Raycast in System Settings › Privacy & Security › Accessibility and Automation";
export const FAILURE_HUD = "Couldn't fill the login";

/**
 * Pastes values into the app that was in front of Raycast. Values go through the clipboard marked as
 * concealed and are replaced right after, by the requested clipboard value or the previous contents.
 */
export async function runFill(
  driver: FillDriver,
  { values, submit = false, getClipboardValue, clipboardValueHud }: FillRequest,
): Promise<void> {
  const previousClipboard = await driver.readClipboard();
  try {
    await driver.returnToPreviousApp();
    for (const [index, value] of values.entries()) {
      if (index > 0) await driver.pressKey(KeyCode.Tab);
      await driver.copyConcealed(value);
      await driver.pressKey(KeyCode.V, ["command"]);
      await driver.wait(PASTE_DELAY_MS);
    }
    if (submit) await driver.pressKey(KeyCode.Return);

    const clipboardValue = await getClipboardValue?.().catch(() => undefined);
    if (clipboardValue) {
      await driver.copyConcealed(clipboardValue);
      if (clipboardValueHud) await driver.showHud(clipboardValueHud);
    } else {
      await driver.restoreClipboard(previousClipboard);
    }
  } catch (error: unknown) {
    await driver.restoreClipboard(previousClipboard);
    const message = error instanceof Error ? error.message : String(error);
    await driver.showHud(isPermissionError(message) ? PERMISSION_HUD : FAILURE_HUD);
  } finally {
    await driver.finish();
  }
}
