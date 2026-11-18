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
 * @property isInternalDebugging - the page sits in the "Internal Debugging Page URLs" section of
 *     chrome://chrome-urls and only loads once internal debugging pages are enabled there. Harmless.
 * @property isDebugCommand - the page sits in the "Command URLs for Debug" section: it deliberately
 *     crashes, hangs, or terminates the browser. Chromium lists these separately from the section
 *     above, and so do we — they are a different risk class, not a noisier version of the same one.
 * @property isUntrusted - whether this is a chrome-untrusted:// URL (runs in isolated security context)
 * @property isDeprecated - whether the URL has been removed from every browser we verified.
 *     Kept in the list so it stays searchable; hidden by default via the Hide Removed URLs preference.
 * @property deprecationNote - why it is gone and what replaced it, shown in the detail pane
 * @property requiresFeatureFlag - a Chromium feature name the URL is gated behind, e.g. "TabGroupHome".
 *     The page is advertised by chrome://chrome-urls but does not resolve unless the feature is on.
 * @property notDirectlyReachable - the URL is advertised by chrome://chrome-urls but will not open in a
 *     tab: it is either a panel embedded in browser UI or gated behind a flag. Verified by navigating to
 *     each URL in Chrome 152 on 2026-09-09.
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
  isDebugCommand?: boolean;
  isUntrusted?: boolean;
  isDeprecated?: boolean;
  deprecationNote?: string;
  requiresFeatureFlag?: string;
  notDirectlyReachable?: boolean;
  supportedBrowsers: string[];
  platforms?: Platform[];
  excludedPlatforms?: Platform[];
}
