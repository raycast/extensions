/**
 * Represents a browser with properties for identification and usage.
 *
 * @property key - A unique identifier for the browser.
 * @property title - The display name of the browser.
 * @property scheme - The URL scheme used for opening URLs (e.g., chrome:// for Google Chrome).
 * @property appName - (Optional) The macOS application name passed to `open -a` by openUrlInBrowser.
 *     A browser without one cannot be launched and is filtered out of the Open in… submenu.
 * @property bundleId - (Optional) The macOS bundle identifier, used to identify the installed app
 *     when resolving its icon. Only present where it was read off a real installed bundle — a name
 *     like "Arc", "Dia" or "Comet" is generic enough that another app could claim it, and the
 *     bundle id is what disambiguates. Absent means "fall back to matching on appName".
 */
export interface Browser {
  key: string;
  title: string;
  scheme: string;
  appName?: string;
  bundleId?: string;
}

export const BROWSER_ARC: Browser = {
  key: "arc",
  title: "Arc",
  scheme: "arc://",
  appName: "Arc",
  bundleId: "company.thebrowser.Browser",
};

export const BROWSER_BRAVE: Browser = {
  key: "brave",
  title: "Brave",
  scheme: "brave://",
  appName: "Brave Browser",
  bundleId: "com.brave.Browser",
};

export const BROWSER_DIA: Browser = {
  key: "dia",
  title: "Dia",
  scheme: "dia://",
  appName: "Dia",
  bundleId: "company.thebrowser.dia",
};

export const BROWSER_CHROME: Browser = {
  key: "chrome",
  title: "Google Chrome",
  scheme: "chrome://",
  appName: "Google Chrome",
  bundleId: "com.google.Chrome",
};

export const BROWSER_EDGE: Browser = {
  key: "edge",
  title: "Microsoft Edge",
  scheme: "edge://",
  appName: "Microsoft Edge",
};

export const BROWSER_OPERA: Browser = {
  key: "opera",
  title: "Opera",
  scheme: "opera://",
  appName: "Opera",
};

export const BROWSER_PERPLEXITY: Browser = {
  key: "comet",
  title: "Perplexity Comet",
  scheme: "comet://",
  appName: "Comet",
  bundleId: "ai.perplexity.comet",
};

export const BROWSER_VIVALDI: Browser = {
  key: "vivaldi",
  title: "Vivaldi",
  scheme: "vivaldi://",
  appName: "Vivaldi",
};

export const SUPPORTED_BROWSERS: Browser[] = [
  BROWSER_ARC,
  BROWSER_BRAVE,
  BROWSER_CHROME,
  BROWSER_DIA,
  BROWSER_EDGE,
  BROWSER_OPERA,
  BROWSER_PERPLEXITY,
  BROWSER_VIVALDI,
];
