import { BrowserExtension, getFrontmostApplication } from "@raycast/api";
import { getArcTabUrlAndTitle } from "./getArcTabUrlAndTitle";

export type CurrentBrowserPage = {
  url: string;
  title: string;
  content: string;
};

async function getArcPage(): Promise<CurrentBrowserPage | null> {
  try {
    const { tabURL, tabTitle } = await getArcTabUrlAndTitle();
    return tabURL ? { url: tabURL, title: tabTitle, content: "" } : null;
  } catch {
    return null;
  }
}

export async function getCurrentBrowserPage(): Promise<CurrentBrowserPage> {
  let arcWasFrontmost = false;
  try {
    const frontmostApplication = await getFrontmostApplication();
    arcWasFrontmost = frontmostApplication.bundleId === "company.thebrowser.Browser";
  } catch {
    // Continue with the browser extension when frontmost-app detection is unavailable.
  }

  if (arcWasFrontmost) {
    const arcPage = await getArcPage();
    if (arcPage) return arcPage;
  }

  try {
    const [tabs, title, content] = await Promise.all([
      BrowserExtension.getTabs(),
      BrowserExtension.getContent({ cssSelector: "title", format: "text" }),
      BrowserExtension.getContent({ format: "markdown" }),
    ]);
    const activeTabs = tabs.filter((tab) => tab.active);
    const tab = activeTabs.find((candidate) => candidate.title?.trim() === title.trim()) ?? activeTabs[0];

    if (tab?.url) {
      return { url: tab.url, title: title.trim() || tab.title?.trim() || "", content };
    }
  } catch {
    // Fall back to Arc when the browser extension is unavailable or denied.
  }

  if (!arcWasFrontmost) {
    const arcPage = await getArcPage();
    if (arcPage) return arcPage;
  }

  throw new Error("Could not read the current tab. Enable the Raycast browser extension or open a tab in Arc.");
}
