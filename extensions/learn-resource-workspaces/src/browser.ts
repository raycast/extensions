export interface BrowserTab {
  id: number;
  url: string;
  title?: string;
  active: boolean;
}

export interface BrowserContext {
  tabs: BrowserTab[];
}

export function getActiveBrowserTabs(context: BrowserContext): BrowserTab[] {
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
