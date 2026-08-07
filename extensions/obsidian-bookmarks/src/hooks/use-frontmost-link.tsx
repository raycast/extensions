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

async function getFrontmostLinkFromExtension(): Promise<Link | null> {
  try {
    const tabs = await BrowserExtension.getTabs();
    const activeTab = tabs.find((tab) => tab.active);

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

async function getFrontmostLinkFromJxa(): Promise<Link | null> {
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

    function getFrontmostArcLink(bundleId) {
      const tab = Application(bundleId).windows[0].activeTab;
      return {url: tab.url(), title: tab.name()};
    }

    function getFrontmostApp() {
      const apps = Application("System Events")
        .applicationProcesses
        .where({frontmost: true})
      return apps[0].bundleIdentifier();
    }

    function getFrontmostLink() {
      const app = getFrontmostApp();
      if (chromium.indexOf(app) !== -1) {
        return getFrontmostChromiumLink(app);
      } else if (safari.indexOf(app) !== -1) {
        return getFrontmostSafariLink(app);
      } else if (arc.indexOf(app) !== -1) {
        return getFrontmostArcLink(app);
      } else {
        return null;
      }
    }

    return getFrontmostLink();
  `,
    [CHROMIUM_BROWSERS, SAFARI_BROWSERS, ARC_BROWSERS]
  );

  if (result == null) return null;
  if (isLink(result)) return result;
  throw new Error(`Unknown link format: ${JSON.stringify(result)}`);
}

export async function getFrontmostLink(): Promise<Link | null> {
  const { useBrowserExtension } = getPreferenceValues<Preferences>();

  // Only try browser extension if the preference is enabled
  if (useBrowserExtension) {
    const extensionLink = await getFrontmostLinkFromExtension();
    if (extensionLink) return extensionLink;
  }

  // Use JXA if browser extension is disabled or fails
  return getFrontmostLinkFromJxa();
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
