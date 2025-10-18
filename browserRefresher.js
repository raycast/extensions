"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoRefreshTabsForDuration = autoRefreshTabsForDuration;
exports.refreshTabsOnce = refreshTabsOnce;
exports.closeBlockedTabs = closeBlockedTabs;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
function extractDomain(input) {
    let domain = input.toLowerCase().trim();
    domain = domain.replace(/^[a-z]+:\/\//, "");
    domain = domain.split("/")[0];
    domain = domain.split("?")[0];
    domain = domain.split("#")[0];
    domain = domain.split(":")[0];
    return domain;
}
function urlMatchesDomain(url, domains) {
    const urlDomain = extractDomain(url);
    return domains.some((domain) => {
        const cleanDomain = extractDomain(domain);
        return (urlDomain === cleanDomain ||
            urlDomain === `www.${cleanDomain}` ||
            urlDomain === cleanDomain.replace(/^www\./, ""));
    });
}
function createSafariRefreshScript(domains) {
    return `
tell application "Safari"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          -- Check if tab URL contains any blocked domain
          ${domains
        .map((domain, idx) => {
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
function createChromeRefreshScript(domains) {
    return `
tell application "Google Chrome"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          -- Check if tab URL contains any blocked domain
          ${domains
        .map((domain, idx) => {
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
function createArcRefreshScript(domains) {
    return `
tell application "Arc"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          -- Check if tab URL contains any blocked domain
          ${domains
        .map((domain, idx) => {
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
function createEdgeRefreshScript(domains) {
    return `
tell application "Microsoft Edge"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          -- Check if tab URL contains any blocked domain
          ${domains
        .map((domain, idx) => {
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
async function refreshBrowserTabs(browser, domains) {
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
        await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    }
    catch (error) {
        console.error(`Error refreshing tabs in ${browser}:`, error.message);
    }
}
async function getRunningBrowsers() {
    const browsers = [
        { name: "Safari", process: "Safari" },
        { name: "Google Chrome", process: "Google Chrome" },
        { name: "Arc", process: "Arc" },
        { name: "Microsoft Edge", process: "Microsoft Edge" },
    ];
    const runningBrowsers = [];
    for (const browser of browsers) {
        try {
            const { stdout } = await execAsync(`pgrep -f "${browser.process}"`);
            if (stdout.trim()) {
                runningBrowsers.push(browser.name);
            }
        }
        catch (error) {
        }
    }
    return runningBrowsers;
}
async function autoRefreshTabsForDuration(domains, durationSeconds = 5) {
    if (!domains || domains.length === 0) {
        console.log("No domains to refresh");
        return;
    }
    console.log(`🔄 Starting auto-refresh for ${durationSeconds} seconds...`);
    const runningBrowsers = await getRunningBrowsers();
    if (runningBrowsers.length === 0) {
        console.log("No supported browsers running - skipping auto-refresh");
        return;
    }
    console.log(`Browsers detected: ${runningBrowsers.join(", ")}`);
    const startTime = Date.now();
    const endTime = startTime + durationSeconds * 1000;
    while (Date.now() < endTime) {
        const refreshPromises = runningBrowsers.map((browser) => refreshBrowserTabs(browser, domains));
        await Promise.allSettled(refreshPromises);
        if (Date.now() < endTime) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    console.log(`✅ Auto-refresh completed after ${durationSeconds} seconds`);
}
async function refreshTabsOnce(domains) {
    if (!domains || domains.length === 0) {
        return;
    }
    const runningBrowsers = await getRunningBrowsers();
    const refreshPromises = runningBrowsers.map((browser) => refreshBrowserTabs(browser, domains));
    await Promise.allSettled(refreshPromises);
}
function createSafariCloseScript(domains) {
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
function createChromeCloseScript(domains) {
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
function createArcCloseScript(domains) {
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
function createEdgeCloseScript(domains) {
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
async function closeBrowserTabs(browser, domains) {
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
        await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    }
    catch (error) {
        console.error(`Error closing tabs in ${browser}:`, error.message);
    }
}
async function closeBlockedTabs(domains) {
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
    const closePromises = runningBrowsers.map((browser) => closeBrowserTabs(browser, domains));
    await Promise.allSettled(closePromises);
    console.log(`✅ Closed all tabs matching blocked domains`);
}
//# sourceMappingURL=browserRefresher.js.map