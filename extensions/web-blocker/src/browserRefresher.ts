/**
 * Browser Tab Refresher for WebBlocker
 * Automatically refreshes browser tabs for blocked/unblocked domains for 4-7 seconds
 * to ensure immediate effect without manual user intervention
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Extracts just the domain name from a URL string
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
 * Creates AppleScript to refresh tabs in Safari for specified domains
 */
function createSafariRefreshScript(domains: string[]): string {
  return `
tell application "Safari"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          -- Check if tab URL contains any blocked domain
          ${domains
            .map((domain) => {
              const cleanDomain = extractDomain(domain);
              const wwwVersion = cleanDomain.startsWith("www.")
                ? cleanDomain
                : `www.${cleanDomain}`;
              const nonWwwVersion = cleanDomain.replace(/^www\./, "");
              return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
              do JavaScript "window.location.reload(true);" in t
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
 * Creates AppleScript to refresh tabs in Chrome for specified domains
 */
function createChromeRefreshScript(domains: string[]): string {
  return `
tell application "Google Chrome"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          -- Check if tab URL contains any blocked domain
          ${domains
            .map((domain) => {
              const cleanDomain = extractDomain(domain);
              const wwwVersion = cleanDomain.startsWith("www.")
                ? cleanDomain
                : `www.${cleanDomain}`;
              const nonWwwVersion = cleanDomain.replace(/^www\./, "");
              return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
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
 * Creates AppleScript to refresh tabs in Arc for specified domains
 */
function createArcRefreshScript(domains: string[]): string {
  return `
tell application "Arc"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          -- Check if tab URL contains any blocked domain
          ${domains
            .map((domain) => {
              const cleanDomain = extractDomain(domain);
              const wwwVersion = cleanDomain.startsWith("www.")
                ? cleanDomain
                : `www.${cleanDomain}`;
              const nonWwwVersion = cleanDomain.replace(/^www\./, "");
              return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
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
 * Creates AppleScript to refresh tabs in Edge for specified domains
 */
function createEdgeRefreshScript(domains: string[]): string {
  return `
tell application "Microsoft Edge"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          -- Check if tab URL contains any blocked domain
          ${domains
            .map((domain) => {
              const cleanDomain = extractDomain(domain);
              const wwwVersion = cleanDomain.startsWith("www.")
                ? cleanDomain
                : `www.${cleanDomain}`;
              const nonWwwVersion = cleanDomain.replace(/^www\./, "");
              return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
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
 * Refresh tabs in a specific browser for domains
 */
async function refreshBrowserTabs(
  browser: string,
  domains: string[],
): Promise<void> {
  try {
    let script = "";

    switch (browser.toLowerCase()) {
      case "safari":
        script = createSafariRefreshScript(domains);
        break;
      case "google chrome":
      case "chrome":
        script = createChromeRefreshScript(domains);
        break;
      case "arc":
        script = createArcRefreshScript(domains);
        break;
      case "microsoft edge":
      case "edge":
        script = createEdgeRefreshScript(domains);
        break;
      default:
        console.log(`Browser ${browser} not supported for auto-refresh`);
        return;
    }

    // Execute the AppleScript
    await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`Error refreshing tabs in ${browser}:`, error.message);
    // Don't throw - we want to continue with other browsers even if one fails
  }
}

/**
 * Gets list of currently running browsers
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
      const { stdout } = await execAsync(`pgrep -f "${browser.process}"`);
      if (stdout.trim()) {
        runningBrowsers.push(browser.name);
      }
    } catch {
      // Browser is not running
    }
  }

  return runningBrowsers;
}

/**
 * Continuously refreshes tabs for specified domains for a duration
 * @param domains - Domains to refresh tabs for
 * @param durationSeconds - How long to keep refreshing (4-7 seconds recommended)
 */
export async function autoRefreshTabsForDuration(
  domains: string[],
  durationSeconds: number = 5,
): Promise<void> {
  if (!domains || domains.length === 0) {
    console.log("No domains to refresh");
    return;
  }

  console.log(`🔄 Starting auto-refresh for ${durationSeconds} seconds...`);

  // Get running browsers
  const runningBrowsers = await getRunningBrowsers();

  if (runningBrowsers.length === 0) {
    console.log("No supported browsers running - skipping auto-refresh");
    return;
  }

  console.log(`Browsers detected: ${runningBrowsers.join(", ")}`);

  const startTime = Date.now();
  const endTime = startTime + durationSeconds * 1000;

  // Refresh every 1 second for the duration
  while (Date.now() < endTime) {
    const refreshPromises = runningBrowsers.map((browser) =>
      refreshBrowserTabs(browser, domains),
    );

    await Promise.allSettled(refreshPromises);

    // Wait 1 second before next refresh cycle
    if (Date.now() < endTime) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`✅ Auto-refresh completed after ${durationSeconds} seconds`);
}

/**
 * Refresh tabs immediately (one-time refresh)
 */
export async function refreshTabsOnce(domains: string[]): Promise<void> {
  if (!domains || domains.length === 0) {
    return;
  }

  const runningBrowsers = await getRunningBrowsers();

  const refreshPromises = runningBrowsers.map((browser) =>
    refreshBrowserTabs(browser, domains),
  );

  await Promise.allSettled(refreshPromises);
}

/**
 * Creates AppleScript to close tabs in Safari for specified domains
 */
function createSafariCloseScript(domains: string[]): string {
  return `
tell application "Safari"
  if it is running then
    repeat with w in windows
      set tabList to tabs of w
      set tabCount to count of tabList
      repeat with i from tabCount to 1 by -1
        try
          set t to item i of tabList
          set tabURL to URL of t
          -- Check if tab URL contains any blocked domain
          ${domains
            .map((domain) => {
              const cleanDomain = extractDomain(domain);
              const wwwVersion = cleanDomain.startsWith("www.")
                ? cleanDomain
                : `www.${cleanDomain}`;
              const nonWwwVersion = cleanDomain.replace(/^www\./, "");
              return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
              close t
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
 * Creates AppleScript to close tabs in Chrome for specified domains
 */
function createChromeCloseScript(domains: string[]): string {
  return `
tell application "Google Chrome"
  if it is running then
    repeat with w in windows
      set tabList to tabs of w
      set tabCount to count of tabList
      repeat with i from tabCount to 1 by -1
        try
          set t to item i of tabList
          set tabURL to URL of t
          -- Check if tab URL contains any blocked domain
          ${domains
            .map((domain) => {
              const cleanDomain = extractDomain(domain);
              const wwwVersion = cleanDomain.startsWith("www.")
                ? cleanDomain
                : `www.${cleanDomain}`;
              const nonWwwVersion = cleanDomain.replace(/^www\./, "");
              return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
              close t
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
 * Creates AppleScript to close tabs in Arc for specified domains
 * Arc supports close command when using tab IDs
 */
function createArcCloseScript(domains: string[]): string {
  const domainConditions = domains
    .map((domain) => {
      const cleanDomain = extractDomain(domain);
      const wwwVersion = cleanDomain.startsWith("www.")
        ? cleanDomain
        : `www.${cleanDomain}`;
      const nonWwwVersion = cleanDomain.replace(/^www\./, "");
      return `(tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}")`;
    })
    .join(" or ");

  return `
tell application "Arc"
  if not (it is running) then return
  
  repeat with w in windows
    set tabsToClose to {}
    repeat with t in tabs of w
      try
        set tabURL to URL of t
        if (${domainConditions}) then
          set end of tabsToClose to id of t
        end if
      end try
    end repeat
    
    repeat with tabId in tabsToClose
      try
        close (first tab of w whose id is tabId)
      end try
    end repeat
  end repeat
end tell
`;
}

/**
 * Creates AppleScript to close tabs in Edge for specified domains
 */
function createEdgeCloseScript(domains: string[]): string {
  return `
tell application "Microsoft Edge"
  if it is running then
    repeat with w in windows
      set tabList to tabs of w
      set tabCount to count of tabList
      repeat with i from tabCount to 1 by -1
        try
          set t to item i of tabList
          set tabURL to URL of t
          -- Check if tab URL contains any blocked domain
          ${domains
            .map((domain) => {
              const cleanDomain = extractDomain(domain);
              const wwwVersion = cleanDomain.startsWith("www.")
                ? cleanDomain
                : `www.${cleanDomain}`;
              const nonWwwVersion = cleanDomain.replace(/^www\./, "");
              return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
              close t
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
 * Close tabs in a specific browser for domains
 */
async function closeBrowserTabs(
  browser: string,
  domains: string[],
): Promise<void> {
  try {
    let script = "";

    switch (browser.toLowerCase()) {
      case "safari":
        script = createSafariCloseScript(domains);
        break;
      case "google chrome":
      case "chrome":
        script = createChromeCloseScript(domains);
        break;
      case "arc":
        script = createArcCloseScript(domains);
        break;
      case "microsoft edge":
      case "edge":
        script = createEdgeCloseScript(domains);
        break;
      default:
        console.log(`Browser ${browser} not supported for tab closing`);
        return;
    }

    // Execute the AppleScript
    await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`Error closing tabs in ${browser}:`, error.message);
    // Don't throw - we want to continue with other browsers even if one fails
  }
}

/**
 * Close all tabs matching blocked domains immediately
 */
export async function closeBlockedTabs(domains: string[]): Promise<void> {
  if (!domains || domains.length === 0) {
    return;
  }

  console.log(`🚫 Closing tabs for ${domains.length} blocked domain(s)...`);

  const runningBrowsers = await getRunningBrowsers();

  if (runningBrowsers.length === 0) {
    console.log("No supported browsers running - skipping tab closing");
    return;
  }

  console.log(`Browsers detected: ${runningBrowsers.join(", ")}`);

  const closePromises = runningBrowsers.map((browser) =>
    closeBrowserTabs(browser, domains),
  );

  await Promise.allSettled(closePromises);

  console.log(`✅ Closed all tabs matching blocked domains`);
}
