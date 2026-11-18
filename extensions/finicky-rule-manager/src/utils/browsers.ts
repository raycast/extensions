import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface Browser {
  name: string;
  bundleId: string;
  homepage?: string;
  appPath?: string;
}

const FINICKY_BUNDLE_ID = "se.johnste.finicky";

/**
 * Fallback list, only used when LaunchServices can't be queried.
 */
const COMMON_BROWSERS: Browser[] = [
  { name: "Safari", bundleId: "com.apple.Safari", homepage: "https://www.apple.com/safari/" },
  { name: "Google Chrome", bundleId: "com.google.Chrome", homepage: "https://www.google.com/chrome/" },
  { name: "Brave Browser", bundleId: "com.brave.Browser", homepage: "https://brave.com" },
  { name: "Arc", bundleId: "company.thebrowser.Browser", homepage: "https://arc.net" },
  { name: "Dia", bundleId: "company.thebrowser.dia", homepage: "https://www.diabrowser.com" },
  { name: "Firefox", bundleId: "org.mozilla.firefox", homepage: "https://www.mozilla.org/firefox/" },
  { name: "Microsoft Edge", bundleId: "com.microsoft.edgemac", homepage: "https://www.microsoft.com/edge" },
  { name: "Opera", bundleId: "com.operasoftware.Opera", homepage: "https://www.opera.com" },
  { name: "Vivaldi", bundleId: "com.vivaldi.Vivaldi", homepage: "https://vivaldi.com" },
  { name: "Chromium", bundleId: "org.chromium.Chromium", homepage: "https://www.chromium.org" },
  {
    name: "Safari Technology Preview",
    bundleId: "com.apple.SafariTechnologyPreview",
    homepage: "https://developer.apple.com/safari/",
  },
  { name: "DuckDuckGo", bundleId: "com.duckduckgo.macos.browser", homepage: "https://duckduckgo.com" },
  { name: "Orion", bundleId: "com.kagi.kagimacOS", homepage: "https://browser.kagi.com" },
  { name: "SigmaOS", bundleId: "com.sigmaos.sigmaos.macos", homepage: "https://sigmaos.com" },
  { name: "Zen", bundleId: "app.zen-browser.zen", homepage: "https://zen-browser.app" },
];

// Asks LaunchServices for every app registered to open https URLs.
const LIST_URL_HANDLERS_JXA = `
ObjC.import("AppKit");
const urls = $.NSWorkspace.sharedWorkspace.URLsForApplicationsToOpenURL($.NSURL.URLWithString("https://example.com"));
const out = [];
for (let i = 0; i < urls.count; i++) {
  const url = urls.objectAtIndex(i);
  const bundle = $.NSBundle.bundleWithURL(url);
  out.push({ bundleId: ObjC.unwrap(bundle.bundleIdentifier) || "", appPath: ObjC.unwrap(url.path) || "" });
}
JSON.stringify(out);
`;

/**
 * Finicky resolves browsers by app name, which is the bundle's file name
 * (e.g. "Google Chrome"), not CFBundleName (which is just "Chrome").
 */
function appNameFromPath(appPath: string): string {
  const fileName = appPath.split("/").pop() ?? "";
  return fileName.replace(/\.app$/, "");
}

/**
 * Skips Finicky itself, apps on mounted disk images, and copies tucked away in
 * hidden folders (Puppeteer, Playwright and editor-bundled Chromium builds).
 */
function isUserFacingBrowser(bundleId: string, appPath: string): boolean {
  if (!bundleId || !appPath) return false;
  if (bundleId === FINICKY_BUNDLE_ID) return false;
  if (appPath.startsWith("/Volumes/")) return false;
  if (appPath.split("/").some((segment) => segment.startsWith("."))) return false;
  return true;
}

function pathRank(appPath: string): number {
  if (appPath.startsWith("/Applications/")) return 0;
  if (appPath.includes("/Applications/")) return 1;
  return 2;
}

async function detectUrlHandlers(): Promise<Browser[]> {
  const { stdout } = await execFileAsync("osascript", ["-l", "JavaScript", "-e", LIST_URL_HANDLERS_JXA]);
  const handlers = JSON.parse(stdout.trim()) as { bundleId: string; appPath: string }[];

  const byBundleId = new Map<string, Browser>();
  for (const { bundleId, appPath } of handlers) {
    if (!isUserFacingBrowser(bundleId, appPath)) continue;

    const existing = byBundleId.get(bundleId);
    if (existing?.appPath && pathRank(existing.appPath) <= pathRank(appPath)) continue;

    const known = COMMON_BROWSERS.find((b) => b.bundleId === bundleId);
    byBundleId.set(bundleId, { name: appNameFromPath(appPath), bundleId, homepage: known?.homepage, appPath });
  }

  return [...byBundleId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function detectCommonBrowsers(): Promise<Browser[]> {
  const installed: Browser[] = [];

  for (const browser of COMMON_BROWSERS) {
    try {
      // Use mdfind to check if the app is installed and get its path
      const { stdout } = await execFileAsync("mdfind", [`kMDItemCFBundleIdentifier == '${browser.bundleId}'`]);
      const appPath = stdout
        .trim()
        .split("\n")
        .find((p) => p && isUserFacingBrowser(browser.bundleId, p));
      if (appPath) {
        installed.push({ ...browser, appPath });
      }
    } catch {
      // Browser not found, skip
    }
  }

  return installed;
}

/**
 * Detects installed browsers on macOS
 */
export async function detectInstalledBrowsers(): Promise<Browser[]> {
  try {
    const browsers = await detectUrlHandlers();
    if (browsers.length > 0) return browsers;
  } catch (error) {
    console.error("LaunchServices browser detection failed, falling back to known list:", error);
  }
  return detectCommonBrowsers();
}

/**
 * Gets a cached list of browsers or detects them
 */
let cachedBrowsers: Browser[] | null = null;
let cacheUpdatedAt = 0;
const BROWSER_CACHE_TTL_MS = 60 * 1000;

export async function getInstalledBrowsers(): Promise<Browser[]> {
  const cacheIsFresh = Date.now() - cacheUpdatedAt < BROWSER_CACHE_TTL_MS;
  if (cachedBrowsers && cacheIsFresh) {
    return cachedBrowsers;
  }

  cachedBrowsers = await detectInstalledBrowsers();
  cacheUpdatedAt = Date.now();
  return cachedBrowsers;
}

/**
 * Clears the browser cache (useful for testing or refresh)
 */
export function clearBrowserCache(): void {
  cachedBrowsers = null;
  cacheUpdatedAt = 0;
}

/**
 * Whether a rule's browser value refers to a detected browser, by app name or bundle ID
 * (Finicky accepts either).
 */
export function isBrowserInstalled(browser: string, installed: Browser[]): boolean {
  const needle = browser.trim().toLowerCase();
  return installed.some((b) => b.name.toLowerCase() === needle || b.bundleId.toLowerCase() === needle);
}
