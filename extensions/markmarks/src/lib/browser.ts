import { getFrontmostApplication, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { ActiveTab, SupportedBrowser } from "./types";

const BROWSER_ALIASES: Record<string, SupportedBrowser> = {
  Safari: "Safari",
  "Google Chrome": "Google Chrome",
  Arc: "Arc",
  Dia: "Dia",
  Zen: "Zen",
  zen: "Zen",
};

const RAYCAST_APPS = new Set(["Raycast", "Raycast Beta"]);

const BROWSER_OPEN_TARGETS: Partial<Record<SupportedBrowser, string>> = {
  Safari: "com.apple.Safari",
};

/**
 * Get the frontmost application name
 */
async function getFrontmostApp(): Promise<string> {
  const frontmostApplication = await getFrontmostApplication();
  return frontmostApplication.name;
}

/**
 * Get visible supported browsers, ordered by macOS process list order.
 */
async function getVisibleSupportedBrowsers(): Promise<SupportedBrowser[]> {
  const script = `
    tell application "System Events"
      set visibleApps to name of every application process whose visible is true
    end tell
    set AppleScript's text item delimiters to "|||"
    set visibleAppsText to visibleApps as text
    set AppleScript's text item delimiters to ""
    return visibleAppsText
  `;
  const result = await runAppleScript(script);

  return result
    .split("|||")
    .map((appName) => getSupportedBrowser(appName.trim()))
    .filter((browser): browser is SupportedBrowser => Boolean(browser));
}

/**
 * Get the active tab from Safari
 */
async function getSafariTab(): Promise<ActiveTab> {
  const script = `
    tell application "Safari"
      set tabTitle to name of current tab of front window
      set tabURL to URL of current tab of front window
    end tell
    return tabTitle & "|||" & tabURL
  `;
  const result = await runAppleScript(script);
  const [title, url] = result.split("|||");
  return { title: title.trim(), url: url.trim() };
}

/**
 * Get the active tab from Chrome
 */
async function getChromeTab(): Promise<ActiveTab> {
  const script = `
    tell application "Google Chrome"
      set tabTitle to title of active tab of front window
      set tabURL to URL of active tab of front window
    end tell
    return tabTitle & "|||" & tabURL
  `;
  const result = await runAppleScript(script);
  const [title, url] = result.split("|||");
  return { title: title.trim(), url: url.trim() };
}

/**
 * Get the active tab from Arc
 */
async function getArcTab(): Promise<ActiveTab> {
  const script = `
    tell application "Arc"
      set tabTitle to title of active tab of front window
      set tabURL to URL of active tab of front window
    end tell
    return tabTitle & "|||" & tabURL
  `;
  const result = await runAppleScript(script);
  const [title, url] = result.split("|||");
  return { title: title.trim(), url: url.trim() };
}

/**
 * Get the active tab from Dia
 */
async function getDiaTab(): Promise<ActiveTab> {
  const script = `
    tell application "Dia"
      tell front window
        set tabTitle to ""
        set tabURL to ""
        repeat with t in tabs
          if isFocused of t is true then
            set tabTitle to title of t
            set tabURL to URL of t
            exit repeat
          end if
        end repeat
      end tell
    end tell
    return tabTitle & "|||" & tabURL
  `;
  const result = await runAppleScript(script);
  const [title, url] = result.split("|||");
  return { title: title.trim(), url: url.trim() };
}

/**
 * Get the active tab from Zen
 */
async function getZenTab(): Promise<ActiveTab> {
  const script = `
    tell application "System Events"
      tell process "zen"
        set tabTitle to value of attribute "AXTitle" of window 1
        set tabURL to value of attribute "AXDocument" of window 1
      end tell
    end tell
    return tabTitle & "|||" & tabURL
  `;
  const result = await runAppleScript(script);
  const [title, url] = result.split("|||");
  return { title: title.trim(), url: url.trim() };
}

function isZenAccessibilityError(error: unknown): boolean {
  return String(error).toLowerCase().includes("not allowed assistive access");
}

/**
 * Get the supported browser for the given app name
 */
function getSupportedBrowser(appName: string): SupportedBrowser | undefined {
  return BROWSER_ALIASES[appName];
}

function getBrowserOpenTarget(browser: SupportedBrowser): string {
  return BROWSER_OPEN_TARGETS[browser] ?? browser;
}

function isValidTab(tab: ActiveTab): boolean {
  return Boolean(tab.title && tab.url);
}

async function getActiveTab(browser: SupportedBrowser): Promise<ActiveTab> {
  switch (browser) {
    case "Safari":
      return await getSafariTab();
    case "Google Chrome":
      return await getChromeTab();
    case "Arc":
      return await getArcTab();
    case "Dia":
      return await getDiaTab();
    case "Zen":
      return await getZenTab();
  }
}

async function getActiveTabIfAvailable(
  browser: SupportedBrowser,
  options: { showPermissionError?: boolean } = {},
): Promise<ActiveTab | undefined> {
  try {
    const tab = await getActiveTab(browser);
    return isValidTab(tab) ? tab : undefined;
  } catch (error) {
    if (browser === "Zen" && options.showPermissionError && isZenAccessibilityError(error)) {
      throw new Error("Zen requires Accessibility access. Enable it for Raycast in System Settings.");
    }

    return undefined;
  }
}

export async function getActiveSupportedBrowser(): Promise<SupportedBrowser | undefined> {
  const frontmostApp = await getFrontmostApp();
  const frontmostBrowser = getSupportedBrowser(frontmostApp);

  if (frontmostBrowser) {
    return frontmostBrowser;
  }

  if (!RAYCAST_APPS.has(frontmostApp)) {
    return undefined;
  }

  const visibleBrowsers = await getVisibleSupportedBrowsers().catch(() => []);
  return visibleBrowsers.toReversed()[0];
}

export async function openUrlInActiveBrowser(url: string): Promise<SupportedBrowser | undefined> {
  const browser = await getActiveSupportedBrowser();
  if (!browser) {
    await open(url);
    return undefined;
  }

  await open(url, getBrowserOpenTarget(browser));
  return browser;
}

/**
 * Get the active tab from the frontmost supported browser
 */
export async function getActiveTabFromFrontmostBrowser(): Promise<{
  tab: ActiveTab;
  browser: SupportedBrowser;
} | null> {
  const frontmostApp = await getFrontmostApp();
  const frontmostBrowser = getSupportedBrowser(frontmostApp);

  if (frontmostBrowser) {
    const tab = await getActiveTabIfAvailable(frontmostBrowser, { showPermissionError: true });
    return tab ? { tab, browser: frontmostBrowser } : null;
  }

  if (!RAYCAST_APPS.has(frontmostApp)) {
    return null;
  }

  const visibleBrowsers = await getVisibleSupportedBrowsers().catch(() => []);
  let zenAccessibilityError: Error | undefined;

  for (const browser of visibleBrowsers.toReversed()) {
    let tab: ActiveTab | undefined;

    try {
      tab = await getActiveTabIfAvailable(browser, { showPermissionError: true });
    } catch (error) {
      if (browser === "Zen") {
        zenAccessibilityError = error instanceof Error ? error : new Error(String(error));
        continue;
      }

      throw error;
    }

    if (tab) {
      return { tab, browser };
    }
  }

  if (zenAccessibilityError) {
    throw zenAccessibilityError;
  }

  return null;
}
