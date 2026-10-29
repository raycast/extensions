import os from "node:os";
import path from "node:path";

export interface BrowserAdapter {
  id: string;
  name: string;
  bundleId: string;
  root: string;
  extensionsUrl: string;
  profileArgument: boolean;
}

const definitions = [
  {
    id: "chrome",
    name: "Google Chrome",
    bundleId: "com.google.Chrome",
    directory: "Google/Chrome",
    extensionsUrl: "chrome://extensions/",
    profileArgument: true,
  },
  {
    id: "dia",
    name: "Dia",
    bundleId: "company.thebrowser.dia",
    directory: "Dia/User Data",
    extensionsUrl: "chrome://extensions/",
    profileArgument: false,
  },
  {
    id: "arc",
    name: "Arc",
    bundleId: "company.thebrowser.Browser",
    directory: "Arc/User Data",
    extensionsUrl: "arc://extensions/",
    profileArgument: false,
  },
  {
    id: "brave",
    name: "Brave",
    bundleId: "com.brave.Browser",
    directory: "BraveSoftware/Brave-Browser",
    extensionsUrl: "brave://extensions/",
    profileArgument: true,
  },
  {
    id: "edge",
    name: "Microsoft Edge",
    bundleId: "com.microsoft.edgemac",
    directory: "Microsoft Edge",
    extensionsUrl: "edge://extensions/",
    profileArgument: true,
  },
  {
    id: "vivaldi",
    name: "Vivaldi",
    bundleId: "com.vivaldi.Vivaldi",
    directory: "Vivaldi",
    extensionsUrl: "vivaldi://extensions/",
    profileArgument: true,
  },
  {
    id: "chromium",
    name: "Chromium",
    bundleId: "org.chromium.Chromium",
    directory: "Chromium",
    extensionsUrl: "chrome://extensions/",
    profileArgument: true,
  },
  {
    id: "chrome-beta",
    name: "Google Chrome Beta",
    bundleId: "com.google.Chrome.beta",
    directory: "Google/Chrome Beta",
    extensionsUrl: "chrome://extensions/",
    profileArgument: true,
  },
  {
    id: "chrome-canary",
    name: "Google Chrome Canary",
    bundleId: "com.google.Chrome.canary",
    directory: "Google/Chrome Canary",
    extensionsUrl: "chrome://extensions/",
    profileArgument: true,
  },
];

export function browserAdapters(home = os.homedir()): BrowserAdapter[] {
  return definitions.map(({ directory, ...browser }) => ({
    ...browser,
    root: path.join(home, "Library", "Application Support", directory),
  }));
}
export const browsers = browserAdapters();
export const browserById = (id: string) => browsers.find((browser) => browser.id === id);
export const browserName = (id: string) => browserById(id)?.name ?? id;
export const browserFromProfileKey = (key: string) => browserName(key.split(":")[0]);
