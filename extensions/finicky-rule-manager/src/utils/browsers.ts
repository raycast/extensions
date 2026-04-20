import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface Browser {
  name: string;
  bundleId: string;
}

const COMMON_BROWSERS: Browser[] = [
  { name: "Safari", bundleId: "com.apple.Safari" },
  { name: "Google Chrome", bundleId: "com.google.Chrome" },
  { name: "Brave Browser", bundleId: "com.brave.Browser" },
  { name: "Arc", bundleId: "company.thebrowser.Browser" },
  { name: "Firefox", bundleId: "org.mozilla.firefox" },
  { name: "Microsoft Edge", bundleId: "com.microsoft.edgemac" },
  { name: "Opera", bundleId: "com.operasoftware.Opera" },
  { name: "Vivaldi", bundleId: "com.vivaldi.Vivaldi" },
  { name: "Chromium", bundleId: "org.chromium.Chromium" },
  { name: "Safari Technology Preview", bundleId: "com.apple.SafariTechnologyPreview" },
  { name: "DuckDuckGo", bundleId: "com.duckduckgo.macos.browser" },
  { name: "Orion", bundleId: "com.kagi.kagimacOS" },
  { name: "SigmaOS", bundleId: "com.sigmaos.sigmaos.macos" },
];

/**
 * Detects installed browsers on macOS
 */
export async function detectInstalledBrowsers(): Promise<Browser[]> {
  const installed: Browser[] = [];

  for (const browser of COMMON_BROWSERS) {
    try {
      // Use mdfind to check if the app is installed
      const { stdout } = await execAsync(`mdfind "kMDItemCFBundleIdentifier == '${browser.bundleId}'"`);
      if (stdout.trim()) {
        installed.push(browser);
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

export async function getInstalledBrowsers(): Promise<Browser[]> {
  if (cachedBrowsers) {
    return cachedBrowsers;
  }

  cachedBrowsers = await detectInstalledBrowsers();
  return cachedBrowsers;
}

/**
 * Clears the browser cache (useful for testing or refresh)
 */
export function clearBrowserCache(): void {
  cachedBrowsers = null;
}
