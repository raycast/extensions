export type KeyModifier = "command" | "shift" | "option" | "control";

/** macOS virtual key codes. Unlike `keystroke`, they don't depend on the keyboard layout. */
export const KeyCode = { V: 9, Tab: 48, Return: 36 } as const;

/** Error raised by keyPressScript() when another app is in front. */
export const NOT_FRONTMOST_ERROR = "The app to fill is not in front";

/** AppleScript that returns the bundle identifier of the frontmost app. */
export const FRONTMOST_BUNDLE_ID_SCRIPT =
  'tell application "System Events" to get bundle identifier of first application process whose frontmost is true';

/** Bundle identifiers only contain letters, digits, hyphens and periods. */
export function isBundleId(value: string | undefined): value is string {
  return value !== undefined && /^[A-Za-z0-9.-]+$/.test(value);
}

/**
 * AppleScript that presses a key through System Events, only if the app with this bundle identifier is in front.
 * Checking in the same script leaves no time for another app to come in between.
 */
export function keyPressScript(keyCode: number, modifiers: KeyModifier[], bundleId: string): string {
  if (!isBundleId(bundleId)) throw new Error(`Invalid bundle identifier: ${bundleId}`);
  const using = modifiers.length > 0 ? ` using {${modifiers.map((modifier) => `${modifier} down`).join(", ")}}` : "";
  return [
    'tell application "System Events"',
    // In a variable first: a comparison right after a `whose` filter would become part of the filter.
    "  set frontmostBundleId to bundle identifier of first application process whose frontmost is true",
    `  if frontmostBundleId is not "${bundleId}" then error "${NOT_FRONTMOST_ERROR}"`,
    `  key code ${keyCode}${using}`,
    "end tell",
  ].join("\n");
}

/**
 * A permission filling needs, in System Settings › Privacy & Security: Accessibility (named Device Control and Data
 * Access in recent macOS versions) to press keys, and Automation to control System Events.
 */
export type FillPermission = "accessibility" | "automation";

/** The pane of System Settings › Privacy & Security where Raycast gets each permission. */
export const PERMISSION_SETTINGS_URLS: Record<FillPermission, string> = {
  accessibility: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  automation: "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation",
};

/** The permission whose absence made System Events fail with this message, if that's why it failed. */
export function missingPermission(message: string): FillPermission | undefined {
  // Raycast may not send Apple events to System Events.
  if (/not authori[sz]ed|\(-1743\)/i.test(message)) return "automation";
  // System Events may not press keys for Raycast.
  if (/not allowed|\(-25211\)|\(1002\)/i.test(message)) return "accessibility";
  return undefined;
}
