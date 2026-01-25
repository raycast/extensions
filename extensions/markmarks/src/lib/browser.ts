import { runAppleScript } from "@raycast/utils";
import { ActiveTab, SupportedBrowser } from "./types";

const SUPPORTED_BROWSERS: SupportedBrowser[] = ["Safari", "Google Chrome", "Arc", "Dia"];

/**
 * Get the frontmost application name
 */
async function getFrontmostApp(): Promise<string> {
  const script = `
    tell application "System Events"
      set frontApp to name of first application process whose frontmost is true
    end tell
    return frontApp
  `;
  return await runAppleScript(script);
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
 * Check if the given app name is a supported browser
 */
function isSupportedBrowser(appName: string): appName is SupportedBrowser {
  return SUPPORTED_BROWSERS.includes(appName as SupportedBrowser);
}

/**
 * Get the active tab from the frontmost supported browser
 */
export async function getActiveTabFromFrontmostBrowser(): Promise<{
  tab: ActiveTab;
  browser: SupportedBrowser;
} | null> {
  const frontmostApp = await getFrontmostApp();

  if (!isSupportedBrowser(frontmostApp)) {
    return null;
  }

  let tab: ActiveTab;

  switch (frontmostApp) {
    case "Safari":
      tab = await getSafariTab();
      break;
    case "Google Chrome":
      tab = await getChromeTab();
      break;
    case "Arc":
      tab = await getArcTab();
      break;
    case "Dia":
      tab = await getDiaTab();
      break;
  }

  return { tab, browser: frontmostApp };
}
