export interface BrowserTab {
  id: number;
  url: string;
  title?: string;
  active: boolean;
}

export interface BrowserContext {
  applicationName?: string;
  tabs: BrowserTab[];
}

const SUPPORTED_BROWSERS = new Set([
  "Safari",
  "Google Chrome",
  "Google Chrome Canary",
  "Arc",
  "Aside",
  "Brave Browser",
  "Microsoft Edge",
  "Vivaldi",
  "Opera",
  "Chromium",
]);

export function getActiveBrowserTabs(context: BrowserContext): BrowserTab[] {
  if (
    context.applicationName &&
    !SUPPORTED_BROWSERS.has(context.applicationName)
  ) {
    throw new Error("Switch to a supported browser before saving its URL");
  }

  const activeTabs = context.tabs.filter((tab) => tab.active);
  if (activeTabs.length === 0) {
    throw new Error("No active browser tab found");
  }

  const validTabs = activeTabs.filter((tab) => {
    try {
      const url = new URL(tab.url);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  });

  if (validTabs.length === 0) {
    throw new Error("Only HTTP and HTTPS browser URLs can be saved");
  }
  return validTabs;
}

export function getActiveBrowserTab(context: BrowserContext): BrowserTab {
  const activeTabs = getActiveBrowserTabs(context);
  if (activeTabs.length > 1) {
    throw new Error("Choose the browser window to save");
  }
  return activeTabs[0];
}
