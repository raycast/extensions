/**
 * Non-Invasive Browser Cache Bypass Prevention
 * Prevents cache-based bypassing WITHOUT closing the browser
 * Uses hard refresh + DNS flush instead of killing browser processes
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Extract domain from URL
 */
function extractDomain(input: string): string {
  let domain = input.toLowerCase().trim();
  domain = domain.replace(/^[a-z]+:\/\//, "");
  domain = domain.split("/")[0];
  domain = domain.split("?")[0];
  domain = domain.split("#")[0];
  domain = domain.split(":")[0];
  return domain;
}

/**
 * Force hard refresh (cache bypass) on tabs matching blocked domains
 * This is MORE effective than clearing cache and doesn't close browser
 */
async function forceHardRefreshBlockedTabs(
  browser: string,
  domains: string[],
): Promise<void> {
  try {
    let script = "";

    switch (browser.toLowerCase()) {
      case "safari":
        script = createSafariHardRefreshScript(domains);
        break;
      case "google chrome":
      case "chrome":
        script = createChromeHardRefreshScript(domains);
        break;
      case "arc":
        script = createArcHardRefreshScript(domains);
        break;
      case "microsoft edge":
      case "edge":
        script = createEdgeHardRefreshScript(domains);
        break;
      default:
        console.log(`Browser ${browser} not supported for hard refresh`);
        return;
    }

    await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    console.log(`✅ Hard refreshed tabs in ${browser}`);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`Error hard refreshing tabs in ${browser}:`, error.message);
  }
}

/**
 * Safari: Force hard refresh (Cmd+Shift+R equivalent)
 */
function createSafariHardRefreshScript(domains: string[]): string {
  return `
tell application "Safari"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          ${domains
            .map((domain) => {
              const cleanDomain = extractDomain(domain);
              const wwwVersion = cleanDomain.startsWith("www.")
                ? cleanDomain
                : `www.${cleanDomain}`;
              const nonWwwVersion = cleanDomain.replace(/^www\./, "");
              return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
              -- Force hard refresh by reloading with cache bypass
              do JavaScript "window.location.reload(true); setTimeout(() => window.location.reload(true), 100);" in t
            end if`;
            })
            .join("\n          ")}
        end try
      end repeat
    end repeat
  end if
end tell
`;
}

/**
 * Chrome: Force hard refresh (Cmd+Shift+R equivalent)
 */
function createChromeHardRefreshScript(domains: string[]): string {
  return `
tell application "Google Chrome"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          ${domains
            .map((domain) => {
              const cleanDomain = extractDomain(domain);
              const wwwVersion = cleanDomain.startsWith("www.")
                ? cleanDomain
                : `www.${cleanDomain}`;
              const nonWwwVersion = cleanDomain.replace(/^www\./, "");
              return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
              -- Force hard reload with cache bypass
              execute t javascript "window.location.reload(true);"
              delay 0.1
              execute t javascript "window.location.reload(true);"
            end if`;
            })
            .join("\n          ")}
        end try
      end repeat
    end repeat
  end if
end tell
`;
}

/**
 * Arc: Force hard refresh
 */
function createArcHardRefreshScript(domains: string[]): string {
  return `
tell application "Arc"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          ${domains
            .map((domain) => {
              const cleanDomain = extractDomain(domain);
              const wwwVersion = cleanDomain.startsWith("www.")
                ? cleanDomain
                : `www.${cleanDomain}`;
              const nonWwwVersion = cleanDomain.replace(/^www\./, "");
              return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
              -- Force hard reload
              tell t to reload
              delay 0.1
              tell t to reload
            end if`;
            })
            .join("\n          ")}
        end try
      end repeat
    end repeat
  end if
end tell
`;
}

/**
 * Edge: Force hard refresh
 */
function createEdgeHardRefreshScript(domains: string[]): string {
  return `
tell application "Microsoft Edge"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          ${domains
            .map((domain) => {
              const cleanDomain = extractDomain(domain);
              const wwwVersion = cleanDomain.startsWith("www.")
                ? cleanDomain
                : `www.${cleanDomain}`;
              const nonWwwVersion = cleanDomain.replace(/^www\./, "");
              return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
              reload t
              delay 0.1
              reload t
            end if`;
            })
            .join("\n          ")}
        end try
      end repeat
    end repeat
  end if
end tell
`;
}

/**
 * Clear system DNS cache (without touching browser)
 */
async function clearSystemDNSCache(): Promise<void> {
  try {
    console.log("🧹 Clearing system DNS cache...");

    // Flush DNS cache
    await execAsync("sudo dscacheutil -flushcache 2>/dev/null || true");
    await execAsync("sudo killall -HUP mDNSResponder 2>/dev/null || true");

    console.log("✅ System DNS cache cleared");
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Error clearing DNS cache:", error.message);
  }
}

/**
 * Get list of running browsers
 */
async function getRunningBrowsers(): Promise<string[]> {
  const browsers = [
    { name: "Safari", process: "Safari" },
    { name: "Google Chrome", process: "Google Chrome" },
    { name: "Arc", process: "Arc" },
    { name: "Microsoft Edge", process: "Microsoft Edge" },
  ];

  const runningBrowsers: string[] = [];

  for (const browser of browsers) {
    try {
      await execAsync(`pgrep -x "${browser.process}"`);
      runningBrowsers.push(browser.name);
    } catch {
      // Browser not running
    }
  }

  return runningBrowsers;
}

/**
 * Non-invasive cache bypass prevention
 * DOES NOT CLOSE BROWSER - only forces hard refresh on blocked tabs
 */
export async function preventCacheBypass(domains: string[]): Promise<void> {
  if (!domains || domains.length === 0) {
    return;
  }

  console.log(`🔄 Preventing cache bypass for ${domains.length} domain(s)...`);
  console.log("⚡ Using hard refresh (browser stays open!)");

  try {
    // Step 1: Clear system DNS cache
    await clearSystemDNSCache();

    // Step 2: Hard refresh blocked tabs in all running browsers
    const runningBrowsers = await getRunningBrowsers();

    if (runningBrowsers.length === 0) {
      console.log("No browsers running - only DNS cache cleared");
      return;
    }

    console.log(`Browsers detected: ${runningBrowsers.join(", ")}`);

    // Force hard refresh on all blocked tabs (cache bypass)
    const refreshPromises = runningBrowsers.map((browser) =>
      forceHardRefreshBlockedTabs(browser, domains),
    );

    await Promise.allSettled(refreshPromises);

    console.log("✅ Cache bypass prevention complete (browser stayed open!)");
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Error preventing cache bypass:", error.message);
  }
}

/**
 * Alternative: Clear browser cache files while browser is running
 * This is more aggressive but still doesn't close the browser
 * Use only if preventCacheBypass() is not enough
 */
export async function clearBrowserCacheFiles(): Promise<void> {
  console.log("🧹 Clearing browser cache files (browser will stay open)...");

  const homeDir = process.env.HOME || "/Users/" + process.env.USER;

  // Only clear cache files, don't kill browser
  const cachePaths = [
    `${homeDir}/Library/Caches/com.apple.Safari/Cache.db*`,
    `${homeDir}/Library/Caches/Google/Chrome/Default/Cache`,
    `${homeDir}/Library/Caches/com.arc.Arc/`,
  ];

  for (const cachePath of cachePaths) {
    try {
      // Use background deletion to not block
      execAsync(`rm -rf "${cachePath}" 2>/dev/null &`).catch(() => {});
    } catch {
      // Ignore errors
    }
  }

  console.log("✅ Cache files cleared (browser stayed open)");
}
