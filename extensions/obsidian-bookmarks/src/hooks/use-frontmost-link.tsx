import { BrowserExtension, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { runJxa } from "run-jxa";
import { ARC_BROWSERS, CHROMIUM_BROWSERS, SAFARI_BROWSERS } from "../helpers/browsers";
import { Preferences } from "../types";

export interface Link {
  title: string;
  url: string;
}

export function isLink(val: unknown): val is Link {
  if (val == null || typeof val !== "object") return false;
  const link = val as Link;
  return typeof link.title === "string" && typeof link.url === "string";
}

/** What the JXA probe reports about the frontmost browser. */
type FrontmostProbe = {
  link: Link | null;
  /** Title of the window actually in front, as seen by System Events. */
  windowTitle: string | null;
  /** Bundle identifier of the frontmost application. */
  app: string | null;
};

const EMPTY_PROBE: FrontmostProbe = { link: null, windowTitle: null, app: null };

async function getFrontmostLinkFromExtension(
  windowTitle?: string | null,
  requireTitleMatch = false
): Promise<Link | null> {
  try {
    const tabs = await BrowserExtension.getTabs();
    // Every window has one active tab, so with several windows open the first
    // active tab isn't necessarily the frontmost one — prefer the tab whose
    // title matches the window actually in front.
    const activeTabs = tabs.filter((tab) => tab.active && tab.url);
    const matching = windowTitle ? activeTabs.find((tab) => tab.title === windowTitle) : undefined;
    const activeTab = matching ?? (requireTitleMatch ? undefined : activeTabs[0]);

    if (!activeTab?.url) return null;

    return {
      title: activeTab.title || "",
      url: activeTab.url,
    };
  } catch (error) {
    console.error("Error getting tab from Browser Extension:", error);
    return null;
  }
}

async function getFrontmostLinkFromJxa(): Promise<FrontmostProbe> {
  const result = await runJxa(
    `
    const [chromium, safari, arc] = args;

    function getFrontmostChromiumLink(bundleId) {
      const tab = Application(bundleId).windows[0].activeTab();
      return {url: tab.url(), title: tab.title()};
    }

    function getFrontmostSafariLink(bundleId) {
      const tab = Application(bundleId).documents[0];
      return {url: tab.url(), title: tab.name()};
    }

    function getFrontmostArcLink(bundleId, windowTitle) {
      const windows = Application(bundleId).windows;
      // Little Arc windows may be missing from Arc's window list, so look for
      // the window whose active tab matches the one actually in front before
      // falling back to the first window.
      const count = windows.length;
      for (let i = 0; windowTitle != null && i < count; i++) {
        try {
          const tab = windows[i].activeTab;
          if (tab.name() === windowTitle) {
            return {url: tab.url(), title: tab.name()};
          }
        } catch (e) {
          // Window without a readable active tab; keep looking.
        }
      }
      const tab = windows[0].activeTab;
      return {url: tab.url(), title: tab.name()};
    }

    function getFrontmostApp() {
      const apps = Application("System Events")
        .applicationProcesses
        .where({frontmost: true})
      return apps[0].bundleIdentifier();
    }

    function getFrontmostWindowTitle() {
      try {
        const apps = Application("System Events")
          .applicationProcesses
          .where({frontmost: true})
        return apps[0].windows[0].name();
      } catch (e) {
        return null;
      }
    }

    function getFrontmostLink() {
      const app = getFrontmostApp();
      const windowTitle = getFrontmostWindowTitle();
      let link = null;
      if (chromium.indexOf(app) !== -1) {
        link = getFrontmostChromiumLink(app);
      } else if (safari.indexOf(app) !== -1) {
        link = getFrontmostSafariLink(app);
      } else if (arc.indexOf(app) !== -1) {
        link = getFrontmostArcLink(app, windowTitle);
      } else {
        return null;
      }
      return {url: link.url, title: link.title, windowTitle: windowTitle, app: app};
    }

    return getFrontmostLink();
  `,
    [CHROMIUM_BROWSERS, SAFARI_BROWSERS, ARC_BROWSERS]
  );

  if (result == null) return EMPTY_PROBE;
  if (isLink(result)) {
    const { windowTitle, app } = result as { windowTitle?: unknown; app?: unknown };
    return {
      link: { title: result.title, url: result.url },
      windowTitle: typeof windowTitle === "string" ? windowTitle : null,
      app: typeof app === "string" ? app : null,
    };
  }
  throw new Error(`Unknown link format: ${JSON.stringify(result)}`);
}

/**
 * True when Arc is in front but showing a window its scripting interface
 * doesn't list — a Little Arc window. The JXA link then belongs to the full
 * window behind it, and only the Browser Extension can see the real page.
 */
function isUnscriptedArcWindowInFront({ link, windowTitle, app }: FrontmostProbe): boolean {
  return app != null && ARC_BROWSERS.includes(app) && link != null && windowTitle != null && link.title !== windowTitle;
}

export async function getFrontmostLink(): Promise<Link | null> {
  const { useBrowserExtension } = getPreferenceValues<Preferences>();

  const probe = await getFrontmostLinkFromJxa().catch((error) => {
    console.error("Error getting link via JXA:", error);
    return EMPTY_PROBE;
  });

  // Only try browser extension if the preference is enabled
  if (useBrowserExtension) {
    const extensionLink = await getFrontmostLinkFromExtension(probe.windowTitle);
    if (extensionLink) return extensionLink;
  } else if (isUnscriptedArcWindowInFront(probe)) {
    // Even with the preference off, the extension is the only way to read a
    // Little Arc window; require an exact title match so a miss degrades to
    // the JXA link instead of another window's tab.
    const extensionLink = await getFrontmostLinkFromExtension(probe.windowTitle, true);
    if (extensionLink) return extensionLink;
  }

  // Use JXA if browser extension is disabled or fails
  return probe.link;
}

export type FrontmostLinkHook = { link: Link | null | undefined; loading: boolean };
export default function useFrontmostLink(): FrontmostLinkHook {
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState<Link | null | undefined>();

  useEffect(() => {
    const fetch = async () => {
      const frontLink = await getFrontmostLink();
      setLink(frontLink);
      setLoading(false);
    };

    fetch();
  }, []);

  return { link, loading };
}
