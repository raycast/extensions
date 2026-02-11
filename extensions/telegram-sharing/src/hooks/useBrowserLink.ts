import { BrowserExtension, environment, getFrontmostApplication, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

interface Preferences {
  useBrowserExtension: boolean;
}

export async function getBrowserLink(): Promise<string> {
  const { useBrowserExtension } = getPreferenceValues<Preferences>();

  // Browser Extension path
  if (useBrowserExtension && environment.canAccess(BrowserExtension)) {
    try {
      const tabs = await BrowserExtension.getTabs();
      const activeTab = tabs.find((tab) => tab.active);
      if (activeTab?.url) return activeTab.url;
      if (tabs[0]?.url) return tabs[0].url;
      throw new Error("No active tab found");
    } catch {
      // fall through
    }
  }

  if (process.platform !== "darwin") {
    throw new Error("Please install the Raycast Browser Extension");
  }

  const app = await getFrontmostApplication();

  switch (app.bundleId) {
    case "company.thebrowser.Browser":
      return runAppleScript(`tell application "Arc" to return URL of active tab of front window`);
    case "com.vivaldi.Vivaldi":
      return runAppleScript(`tell application "Vivaldi" to return URL of active tab of front window`);
    case "com.google.Chrome":
      return runAppleScript(`tell application "Google Chrome" to return URL of active tab of front window`);
    case "com.brave.Browser":
      return runAppleScript(`tell application "Brave Browser" to return URL of active tab of front window`);
    case "com.apple.Safari":
      return runAppleScript(`tell application "Safari" to return URL of front document`);
    case "com.kagi.kagimacOS":
      return runAppleScript(`tell application "Orion" to return URL of front document`);
    case "org.mozilla.firefox":
      return runAppleScript(`
        tell application "System Events"
          set firefox to application process "Firefox"

          -- HACK: It is important to get the list of UI elements; otherwise, we get an error
          get properties of firefox

          set frontWindow to front window of firefox
          set firstGroup to first group of frontWindow
          set navigation to toolbar "Navigation" of firstGroup
          get value of UI element 1 of combo box 1 of navigation
        end tell
      `);
    case "app.zen-browser.zen":
      return runAppleScript(`
        tell application "System Events"
            set zen to application process "Zen"

            get properties of zen

            set frontWindow to front window of zen
            set firstGroup to first group of frontWindow
            set navigation to toolbar "Navigation" of group 1 of group 1 of firstGroup
            get value of UI element 1 of combo box 1 of group 1 of navigation
        end tell
      `);
    case "company.thebrowser.dia":
      return runAppleScript(`
        tell application "Dia"
          return URL of (first tab of front window whose isFocused is true)
        end tell`);
    default:
      break;
  }

  // Fallback for Vivaldi Browser not recognized by bundleId
  if (app?.name === "Vivaldi.app") {
    return runAppleScript(`tell application "Vivaldi" to return URL of active tab of front window`);
  }

  throw new Error(`Unsupported App: ${app.name}`);
}

export async function getBrowserPageTitle(): Promise<string | undefined> {
  const { useBrowserExtension } = getPreferenceValues<Preferences>();

  // Browser Extension path
  if (useBrowserExtension && environment.canAccess(BrowserExtension)) {
    try {
      const tabs = await BrowserExtension.getTabs();
      const activeTab = tabs.find((tab) => tab.active);
      if (activeTab?.url) return activeTab.title;
      if (tabs[0]?.url) return tabs[0].title;
      throw new Error("No active tab found");
    } catch {
      // fall through
      return undefined;
    }
  }
}
