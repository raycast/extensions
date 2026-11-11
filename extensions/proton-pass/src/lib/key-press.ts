export type KeyModifier = "command" | "shift" | "option" | "control";

/** macOS virtual key codes. Unlike `keystroke`, they don't depend on the keyboard layout. */
export const KeyCode = { V: 9, Tab: 48, Return: 36 } as const;

/** Error raised by keyPressScript() when another app is in front, followed by that app's name in brackets. */
export const NOT_FRONTMOST_ERROR = "The app to fill is not in front";

/** AppleScript that returns the bundle identifier and the name of the frontmost app, on two lines. */
export const FRONTMOST_APP_SCRIPT = [
  'tell application "System Events"',
  "  set frontmostApp to first application process whose frontmost is true",
  "  return (bundle identifier of frontmostApp as text) & linefeed & displayed name of frontmostApp",
  "end tell",
].join("\n");

/** The app System Events sees in front. Its bundle identifier is empty when it has none. */
export interface FrontmostApp {
  bundleId: string;
  name?: string;
}

/** A name to show, or undefined when AppleScript gave none. */
function appName(value: string | undefined): string | undefined {
  const name = value?.trim();
  return name && name !== "missing value" ? name : undefined;
}

/** Reads the output of FRONTMOST_APP_SCRIPT. */
export function parseFrontmostApp(output: string): FrontmostApp {
  const [bundleId = "", ...name] = output.split("\n");
  return { bundleId: bundleId === "missing value" ? "" : bundleId.trim(), name: appName(name.join("\n")) };
}

/** The name of the app in front, from the error of a keyPressScript() that stopped because of it. */
export function frontmostNameFromError(message: string): string | undefined {
  // Up to the last bracket: the name may contain one.
  return appName(message.match(new RegExp(`${NOT_FRONTMOST_ERROR} \\[(.*)\\]`, "s"))?.[1]);
}

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
    "  set frontmostApp to first application process whose frontmost is true",
    // The error names the app in front, so that the HUD can tell which one took the place of the app to fill.
    `  if bundle identifier of frontmostApp is not "${bundleId}" then error "${NOT_FRONTMOST_ERROR} [" & displayed name of frontmostApp & "]"`,
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
