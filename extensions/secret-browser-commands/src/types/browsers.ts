/**
 * Represents a browser with properties for identification and usage.
 *
 * @property key - A unique identifier for the browser.
 * @property title - The display name of the browser.
 * @property scheme - The URL scheme associated with the browser.
 * @property appName - (Optional) The application name for use with Action.OpenInBrowser.
 */
export interface Browser {
  key: string;
  title: string;
  scheme: string;
  appName?: string;
}

export const BROWSER_ARC: Browser = {
  key: "arc",
  title: "Arc",
  scheme: "arc://",
  appName: "Arc",
};

export const BROWSER_BRAVE: Browser = {
  key: "brave",
  title: "Brave",
  scheme: "brave://",
  appName: "Brave Browser",
};

export const BROWSER_DIA: Browser = {
  key: "dia",
  title: "Dia",
  scheme: "dia://",
  appName: "Dia",
};

export const BROWSER_CHROME: Browser = {
  key: "chrome",
  title: "Google Chrome",
  scheme: "chrome://",
  appName: "Google Chrome",
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
  scheme: "chrome://", // it will resolve as browser:// but this is more reliable
  appName: "Comet",
};

export const BROWSER_VIVALDI: Browser = {
  key: "vivaldi",
  title: "Vivaldi",
  scheme: "vivaldi:",
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

/**
 * A map of browser keys to their corresponding application names.
 *
 * @type {Object}
 * @property {string} [key] - The key of the browser.
 * @property {string | undefined} [appName] - The application name associated with the browser.
 */
export const browserAppMap: { [key: string]: string | undefined } = SUPPORTED_BROWSERS.reduce(
  (acc, browser) => {
    acc[browser.key] = browser.appName;
    return acc;
  },
  {} as { [key: string]: string | undefined },
);

/**
 * A map of browser keys to their corresponding URL schemes.
 *
 * @type {Object}
 * @property {string} [key] - The key of the browser.
 * @property {string} [scheme] - The URL scheme associated with the browser.
 */
export const browserSchemeMap: { [key: string]: string } = SUPPORTED_BROWSERS.reduce(
  (acc, browser) => {
    acc[browser.key] = browser.scheme;
    return acc;
  },
  {} as { [key: string]: string },
);
