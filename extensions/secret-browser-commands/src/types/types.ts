/**
 * Represents basic browser information used in command descriptions
 *
 * @property title - The display name of the browser
 */
export interface BrowserInfo {
  title: string;
}

/**
 * Supported operating system platforms
 */
export type Platform = "windows" | "mac" | "linux";

/**
 * An object representing a command in the browser.
 *
 * @property id - the identifier for the command (e.g., 'about')
 * @property name - the display name for the command (e.g., 'About')
 * @property path - the URL path for the command (e.g., 'settings' for 'chrome://settings')
 * @property description - a description of the command, either as a string or as a function that takes
 *     a preferred browser object and returns a string
 * @property isInternalDebugging - whether this command requires enabling internal debugging
 * @property supportedBrowsers - array of browser keys that support this command (e.g., ['chrome', 'arc', 'brave'])
 * @property platforms - array of platforms where this command is available (if omitted, available on all platforms)
 * @property excludedPlatforms - array of platforms where this command is NOT available
 */
export interface BrowserCommand {
  id: string;
  name: string;
  path: string;
  description: string | ((preferredBrowser: BrowserInfo) => string);
  isInternalDebugging?: boolean;
  supportedBrowsers: string[];
  platforms?: Platform[];
  excludedPlatforms?: Platform[];
}
