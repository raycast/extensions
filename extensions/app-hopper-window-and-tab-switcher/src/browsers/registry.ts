import type { BrowserConfig } from "./types";

export const browsers: BrowserConfig[] = [
  {
    id: "chrome",
    appName: "Google Chrome",
    engine: "chromium",
  },
  {
    id: "edge",
    appName: "Microsoft Edge",
    engine: "chromium",
  },
  {
    id: "brave",
    appName: "Brave Browser",
    engine: "chromium",
  },
  {
    id: "vivaldi",
    appName: "Vivaldi",
    engine: "chromium",
  },
  { id: "opera", appName: "Opera", engine: "chromium" },
  { id: "firefox", appName: "Firefox", engine: "firefox" },
  { id: "zen", appName: "Zen", engine: "firefox" },
  { id: "safari", appName: "Safari", engine: "webkit" },
  { id: "orion", appName: "Orion", engine: "webkit" },
];

export function getBrowserByAppName(appName: string, appPath?: string): BrowserConfig | undefined {
  const browser = browsers.find((browser) => browser.appName === appName);
  return browser && appPath ? { ...browser, appPath } : browser;
}

export function getBrowserById(id: string): BrowserConfig | undefined {
  return browsers.find((browser) => browser.id === id);
}
