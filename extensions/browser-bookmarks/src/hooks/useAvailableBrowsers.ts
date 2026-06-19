import { Application, getApplications } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

function getWindowsLocalAppData() {
  if (process.env.LOCALAPPDATA) {
    return process.env.LOCALAPPDATA;
  }

  if (process.env.USERPROFILE) {
    return join(process.env.USERPROFILE, "AppData", "Local");
  }

  const homeDirectory = homedir();

  if (homeDirectory) {
    return join(homeDirectory, "AppData", "Local");
  }

  return "";
}

const WINDOWS_LOCAL_APPDATA = process.platform === "win32" ? getWindowsLocalAppData() : "";

export const BROWSERS_BUNDLE_ID = {
  arc: "company.thebrowser.browser",
  brave: "com.brave.browser",
  braveBeta: "com.brave.browser.beta",
  braveNightly: "com.brave.browser.nightly",
  chrome: "com.google.chrome",
  chromeBeta: "com.google.chrome.beta",
  chromeDev: "com.google.chrome.dev",
  comet: "ai.perplexity.comet",
  dia: "company.thebrowser.dia",
  chatGPTAtlas: "com.openai.atlas",
  firefox: "org.mozilla.firefox",
  firefoxDev: "org.mozilla.firefoxdeveloperedition",
  ghostBrowser: "com.ghostbrowser.gb1",
  island: "io.island.island",
  safari: "com.apple.safari",
  sidekick: "com.pushplaylabs.sidekick",
  edge: "com.microsoft.edgemac",
  edgeDev: "com.microsoft.edgemac.dev",
  edgeCanary: "com.microsoft.edgemac.canary",
  prismaAccess: "com.talon-sec.work",
  vivaldi: "com.vivaldi.vivaldi",
  vivaldiSnapshot: "com.vivaldi.vivaldi.snapshot",
  zen: "app.zen-browser.zen",
  libreWolf: "org.mozilla.librewolf",
  whale: "com.naver.whale",
  helium: "net.imput.helium",
} as const;

export type BrowserId = (typeof BROWSERS_BUNDLE_ID)[keyof typeof BROWSERS_BUNDLE_ID];

type BrowserDefinition = {
  id: BrowserId;
  name: string;
  macBundleId?: string;
  windowsDisplayNames?: string[];
  windowsExecutables?: string[];
  windowsUserDataPath?: string;
};

export type BrowserApplication = Application & {
  browserId: BrowserId;
};

const BROWSER_DEFINITIONS: BrowserDefinition[] = [
  { id: BROWSERS_BUNDLE_ID.arc, name: "Arc", macBundleId: "company.thebrowser.browser" },
  {
    id: BROWSERS_BUNDLE_ID.brave,
    name: "Brave",
    macBundleId: "com.brave.browser",
    windowsDisplayNames: ["Brave"],
    windowsExecutables: ["brave.exe"],
    windowsUserDataPath: WINDOWS_LOCAL_APPDATA
      ? join(WINDOWS_LOCAL_APPDATA, "BraveSoftware", "Brave-Browser", "User Data")
      : undefined,
  },
  { id: BROWSERS_BUNDLE_ID.braveBeta, name: "Brave Beta", macBundleId: "com.brave.browser.beta" },
  { id: BROWSERS_BUNDLE_ID.braveNightly, name: "Brave Nightly", macBundleId: "com.brave.browser.nightly" },
  {
    id: BROWSERS_BUNDLE_ID.chrome,
    name: "Chrome",
    macBundleId: "com.google.chrome",
    windowsDisplayNames: ["Google Chrome", "Chrome"],
    windowsExecutables: ["chrome.exe"],
    windowsUserDataPath: WINDOWS_LOCAL_APPDATA
      ? join(WINDOWS_LOCAL_APPDATA, "Google", "Chrome", "User Data")
      : undefined,
  },
  { id: BROWSERS_BUNDLE_ID.chromeBeta, name: "Chrome Beta", macBundleId: "com.google.chrome.beta" },
  { id: BROWSERS_BUNDLE_ID.chromeDev, name: "Chrome Dev", macBundleId: "com.google.chrome.dev" },
  { id: BROWSERS_BUNDLE_ID.comet, name: "Comet", macBundleId: "ai.perplexity.comet" },
  { id: BROWSERS_BUNDLE_ID.dia, name: "Dia", macBundleId: "company.thebrowser.dia" },
  { id: BROWSERS_BUNDLE_ID.chatGPTAtlas, name: "ChatGPT Atlas", macBundleId: "com.openai.atlas" },
  { id: BROWSERS_BUNDLE_ID.firefox, name: "Firefox", macBundleId: "org.mozilla.firefox" },
  { id: BROWSERS_BUNDLE_ID.firefoxDev, name: "Firefox Dev", macBundleId: "org.mozilla.firefoxdeveloperedition" },
  { id: BROWSERS_BUNDLE_ID.ghostBrowser, name: "Ghost Browser", macBundleId: "com.ghostbrowser.gb1" },
  { id: BROWSERS_BUNDLE_ID.island, name: "Island", macBundleId: "io.island.island" },
  { id: BROWSERS_BUNDLE_ID.safari, name: "Safari", macBundleId: "com.apple.safari" },
  { id: BROWSERS_BUNDLE_ID.sidekick, name: "Sidekick", macBundleId: "com.pushplaylabs.sidekick" },
  {
    id: BROWSERS_BUNDLE_ID.edge,
    name: "Edge",
    macBundleId: "com.microsoft.edgemac",
    windowsDisplayNames: ["Microsoft Edge", "Edge"],
    windowsExecutables: ["msedge.exe"],
    windowsUserDataPath: WINDOWS_LOCAL_APPDATA
      ? join(WINDOWS_LOCAL_APPDATA, "Microsoft", "Edge", "User Data")
      : undefined,
  },
  { id: BROWSERS_BUNDLE_ID.edgeDev, name: "Edge Dev", macBundleId: "com.microsoft.edgemac.dev" },
  { id: BROWSERS_BUNDLE_ID.edgeCanary, name: "Edge Canary", macBundleId: "com.microsoft.edgemac.canary" },
  { id: BROWSERS_BUNDLE_ID.prismaAccess, name: "Prisma Access", macBundleId: "com.talon-sec.work" },
  { id: BROWSERS_BUNDLE_ID.vivaldi, name: "Vivaldi", macBundleId: "com.vivaldi.vivaldi" },
  { id: BROWSERS_BUNDLE_ID.vivaldiSnapshot, name: "Vivaldi Snapshot", macBundleId: "com.vivaldi.vivaldi.snapshot" },
  { id: BROWSERS_BUNDLE_ID.zen, name: "Zen", macBundleId: "app.zen-browser.zen" },
  { id: BROWSERS_BUNDLE_ID.libreWolf, name: "LibreWolf", macBundleId: "org.mozilla.librewolf" },
  { id: BROWSERS_BUNDLE_ID.whale, name: "Whale", macBundleId: "com.naver.whale" },
  { id: BROWSERS_BUNDLE_ID.helium, name: "Helium", macBundleId: "net.imput.helium" },
];

const BROWSER_DEFINITION_BY_ID = new Map(BROWSER_DEFINITIONS.map((definition) => [definition.id, definition]));

export const availableBrowsers = BROWSER_DEFINITIONS.map((definition) => definition.id);

function normalize(value?: string) {
  return value?.toLowerCase() ?? "";
}

function matchesWindowsBrowser(app: Application, definition: BrowserDefinition) {
  const normalizedName = normalize(app.name);
  const normalizedPath = normalize(app.path);

  return Boolean(
    definition.windowsDisplayNames?.some((name) => {
      const normalizedDisplayName = normalize(name);
      return normalizedName === normalizedDisplayName;
    }) || definition.windowsExecutables?.some((executable) => normalizedPath.endsWith(`\\${executable}`)),
  );
}

export function getBrowserDefinition(browserId: string) {
  return BROWSER_DEFINITION_BY_ID.get(browserId as BrowserId);
}

export function getBrowserIdForApplication(app: Application): BrowserId | undefined {
  if (process.platform === "win32") {
    return BROWSER_DEFINITIONS.find((definition) => matchesWindowsBrowser(app, definition))?.id;
  }

  const normalizedBundleId = normalize(app.bundleId);
  return BROWSER_DEFINITIONS.find((definition) => definition.macBundleId === normalizedBundleId)?.id;
}

export function getBrowserDataPath(browserId: string, macOSPath: string) {
  if (process.platform !== "win32") {
    return macOSPath;
  }

  return getBrowserDefinition(browserId)?.windowsUserDataPath ?? macOSPath;
}

export async function listAvailableBrowsers(): Promise<BrowserApplication[]> {
  const apps = await getApplications();

  if (process.platform === "win32") {
    const browsersById = new Map<BrowserId, BrowserApplication>();

    for (const app of apps) {
      const browserId = getBrowserIdForApplication(app);

      if (!browserId || browsersById.has(browserId)) {
        continue;
      }

      browsersById.set(browserId, { ...app, browserId });
    }

    for (const definition of BROWSER_DEFINITIONS) {
      if (
        !definition.windowsUserDataPath ||
        browsersById.has(definition.id) ||
        !existsSync(definition.windowsUserDataPath)
      ) {
        continue;
      }

      browsersById.set(definition.id, {
        name: definition.name,
        path: "",
        bundleId: "",
        executable: "",
        browserId: definition.id,
      } as BrowserApplication);
    }

    return BROWSER_DEFINITIONS.map((definition) => browsersById.get(definition.id)).filter(
      Boolean,
    ) as BrowserApplication[];
  }

  return apps
    .map((app) => {
      const browserId = getBrowserIdForApplication(app);
      return browserId ? { ...app, bundleId: normalize(app.bundleId), browserId } : undefined;
    })
    .filter(Boolean) as BrowserApplication[];
}

export default function useAvailableBrowsers() {
  return useCachedPromise(listAvailableBrowsers);
}
