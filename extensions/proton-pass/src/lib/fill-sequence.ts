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
  /** Presses a key in the app being filled. Throws a TargetAppError when another app is in front. */
  pressKey(keyCode: number, modifiers?: KeyModifier[]): Promise<void>;
  /**
   * Closes Raycast and resolves once the app that was in front of it has the focus back.
   * Throws a TargetAppError when that app can't be confirmed.
   */
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
  /** HUD shown when getClipboardValue fails or returns nothing. */
  clipboardValueFailureHud?: string;
}

/** Stops the fill when the app to fill isn't in front, so that nothing is pasted elsewhere. Its message is the HUD. */
export class TargetAppError extends Error {
  name = "TargetAppError";
}

/** Time for the app to read the clipboard after ⌘V, before the clipboard changes again. */
export const PASTE_DELAY_MS = 300;
export const PERMISSION_HUD = "Allow Raycast in System Settings › Privacy & Security › Accessibility and Automation";
export const FAILURE_HUD = "Couldn't fill the login";

function failureHud(error: unknown): string {
  if (error instanceof TargetAppError) return error.message;
  const message = error instanceof Error ? error.message : String(error);
  return isPermissionError(message) ? PERMISSION_HUD : FAILURE_HUD;
}

/**
 * Pastes values into the app that was in front of Raycast. Values go through the clipboard marked as
 * concealed and are replaced right after, by the requested clipboard value or the previous contents.
 */
export async function runFill(
  driver: FillDriver,
  { values, submit = false, getClipboardValue, clipboardValueHud, clipboardValueFailureHud }: FillRequest,
): Promise<void> {
  const previousClipboard = await driver.readClipboard();
  let hasChangedClipboard = false;
  try {
    await driver.returnToPreviousApp();
    for (const [index, value] of values.entries()) {
      if (index > 0) await driver.pressKey(KeyCode.Tab);
      hasChangedClipboard = true;
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
      // The value was expected, e.g. the item has a 2FA code: say why the clipboard doesn't hold it.
      if (getClipboardValue && clipboardValueFailureHud) await driver.showHud(clipboardValueFailureHud);
    }
  } catch (error: unknown) {
    if (hasChangedClipboard) await driver.restoreClipboard(previousClipboard);
    await driver.showHud(failureHud(error));
  } finally {
    await driver.finish();
  }
}
