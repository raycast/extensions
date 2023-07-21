import { runAppleScript } from "run-applescript";

/**
 * Gets the URL of the active tab in Safari.
 *
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getCurrentSafariURL = async (): Promise<string[]> => {
  const data = await runAppleScript(`try
          tell application "Safari"
              return {name, URL} of document 1
          end tell
      end try`);
  return data.split(", ");
};

/**
 * Gets the URL of the active tab in Arc.
 *
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getArcURL = async (): Promise<string[]> => {
  const data = await runAppleScript(`try
          tell application "Arc"
              return {title, URL} of active tab of window 1
          end tell
      end try`);
  return data.split(", ");
};

/**
 * Gets the URL of the active tab in iCab.
 *
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getiCabURL = async (): Promise<string[]> => {
  const data = await runAppleScript(`try
          tell application "iCab"
              return {name, url} of document 1
          end tell
      end try`);
  return data.split(", ");
};

/**
 * Gets the URL of the active tab in a Chromium-based browser.
 *
 * @param browserName The name of the browser.
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getChromiumURL = async (browserName: string): Promise<string[]> => {
  const data = await runAppleScript(`try
          tell application "${browserName}"
              set tabIndex to active tab index of window 1
              return {title, URL} of tab tabIndex of window 1
          end tell
      end try`);
  return data.split(", ");
};

/**
 * The browsers from which the current URL can be obtained.
 */
export const SupportedBrowsers = [
  "Safari",
  "Chromium",
  "Google Chrome",
  "Opera",
  "Opera Neon",
  "Vivaldi",
  "Microsoft Edge",
  "Brave Browser",
  "Iron",
  "Yandex",
  "Blisk",
  "Epic",
  "Arc",
  "iCab",
];

/**
 * Gets the current URL of the active tab of the specified browser.
 *
 * @param browserName The name of the browser application. Must be a member of {@link SupportedBrowsers}.
 * @returns A promise which resolves to the URL of the active tab of the browser as a string.
 */
export const getCurrentURL = async (browserName: string): Promise<string[]> => {
  switch (browserName) {
    case "Safari":
      return getCurrentSafariURL();
      break;
    case "Google Chrome":
    case "Microsoft Edge":
    case "Brave Browser":
    case "Opera":
    case "Vivaldi":
    case "Chromium":
      return getChromiumURL(browserName);
      break;
    case "Arc":
      return getArcURL();
      break;
    case "iCab":
      return getiCabURL();
      break;
  }
  return ["", ""];
};
