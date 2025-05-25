/**
 * An object representing a command in the browser.
 *
 * @property id - the identifier for the command (e.g., 'about')
 * @property name - the display name for the command (e.g., 'About')
 * @property path - the URL path for the command (e.g., 'settings' for 'chrome://settings')
 * @property description - a description of the command, either as a string or as a function that takes
 *     a preferred browser object and returns a string
 * @property isInternalDebugging - whether this command requires enabling internal debugging
 */
export interface BrowserCommand {
  id: string;
  name: string;
  path: string;
  description: string | ((preferredBrowser: { title: string }) => string);
  isInternalDebugging?: boolean;
}

/**
 * An object representing user preferences.
 *
 * @property preferredBrowser - the key of the preferred browser (e.g., 'chrome')
 */
export interface Preferences {
  preferredBrowser: string;
}
