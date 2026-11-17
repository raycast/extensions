import { FillPermission, KeyCode, KeyModifier, missingPermission } from "./key-press";

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
  /** Opens System Settings where Raycast gets this permission. */
  openPermissionSettings(permission: FillPermission): Promise<void>;
  showHud(message: string): Promise<void>;
  /** Records why filling failed, since the HUD only gives the gist. */
  logError?(error: unknown): void;
  /** Called last, whatever happened. */
  finish(): Promise<void>;
}

export interface FillRequest {
  /** Pasted one after the other, with Tab in between to move to the next field. */
  values: string[];
  /** Press Return after the last value. */
  submit?: boolean;
  /** Value to leave in the clipboard afterwards, such as a TOTP code. Otherwise the previous clipboard is restored. */
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
/**
 * Shown once System Settings is open where Raycast lacks a permission. Short enough not to be cut, and without the
 * pane's name, which differs between macOS versions.
 */
export const PERMISSION_HUD = "Allow Raycast in the settings just opened, then try again";
/** When System Settings couldn't be opened. */
export const PERMISSION_FALLBACK_HUD = "Allow Raycast in System Settings › Privacy & Security";
export const FAILURE_HUD = "Couldn't fill the login";

/** Longest HUD built here, as long as PERMISSION_HUD: Raycast cuts longer ones. */
const MAX_HUD_LENGTH = 57;

/** Cuts text to at most this many characters, ending with an ellipsis. */
function shorten(text: string, maxLength: number): string {
  const characters = Array.from(text);
  if (characters.length <= maxLength) return text;
  const kept = characters.slice(0, maxLength - 1).join("");
  return `${kept.trimEnd()}…`;
}

/**
 * Message of a TargetAppError. Names the app System Events sees in front, since the user knows which one they were
 * filling. A long name is cut so that the HUD isn't, and "is in front" stays visible.
 */
export function notInFrontHud(frontmostName: string | undefined, targetName: string): string {
  if (!frontmostName) return "Stopped filling: another app is in front";
  // Another program with the same name as the app to fill.
  const sameName = frontmostName.toLowerCase() === targetName.trim().toLowerCase();
  const prefix = sameName ? "Stopped filling: another " : "Stopped filling: ";
  const suffix = " is in front";
  return `${prefix}${shorten(frontmostName, MAX_HUD_LENGTH - prefix.length - suffix.length)}${suffix}`;
}

/** Raycast is closed by now, so a HUD is all that can show. When a permission is missing, opens where to give it. */
async function failureHud(driver: FillDriver, error: unknown): Promise<string> {
  if (error instanceof TargetAppError) return error.message;
  const permission = missingPermission(error instanceof Error ? error.message : String(error));
  if (!permission) return FAILURE_HUD;
  try {
    await driver.openPermissionSettings(permission);
    return PERMISSION_HUD;
  } catch (openError: unknown) {
    driver.logError?.(openError);
    return PERMISSION_FALLBACK_HUD;
  }
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
      // The value was expected, e.g. the item has a TOTP code: say why the clipboard doesn't hold it.
      if (getClipboardValue && clipboardValueFailureHud) await driver.showHud(clipboardValueFailureHud);
    }
  } catch (error: unknown) {
    driver.logError?.(error);
    if (hasChangedClipboard) await driver.restoreClipboard(previousClipboard);
    await driver.showHud(await failureHud(driver, error));
  } finally {
    await driver.finish();
  }
}
