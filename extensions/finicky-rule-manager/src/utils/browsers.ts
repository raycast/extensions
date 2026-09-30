import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface Browser {
  name: string;
  bundleId: string;
  homepage?: string;
  appPath?: string;
}

const COMMON_BROWSERS: Browser[] = [
  { name: "Safari", bundleId: "com.apple.Safari", homepage: "https://www.apple.com/safari/" },
  { name: "Google Chrome", bundleId: "com.google.Chrome", homepage: "https://www.google.com/chrome/" },
  { name: "Brave Browser", bundleId: "com.brave.Browser", homepage: "https://brave.com" },
  { name: "Arc", bundleId: "company.thebrowser.Browser", homepage: "https://arc.net" },
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
];

/**
 * Detects installed browsers on macOS
 */
export async function detectInstalledBrowsers(): Promise<Browser[]> {
  const installed: Browser[] = [];

  for (const browser of COMMON_BROWSERS) {
    try {
      // Use mdfind to check if the app is installed and get its path
      const { stdout } = await execAsync(`mdfind "kMDItemCFBundleIdentifier == '${browser.bundleId}'"`);
      const appPath = stdout.trim().split("\n")[0]; // Get first result
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
