import {
  showHUD,
  getFrontmostApplication,
  BrowserExtension,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { saveItem, fetchPageTitle, titleLooksLikeDomain } from "./api";

const CHROMIUM_BROWSERS = new Set([
  "Google Chrome",
  "Google Chrome Canary",
  "Dia",
  "Arc",
  "Brave Browser",
  "Brave Browser Beta",
  "Microsoft Edge",
  "Microsoft Edge Canary",
  "Vivaldi",
  "Opera",
]);

const SAFARI_BROWSERS = new Set(["Safari", "Safari Technology Preview"]);

interface ActiveTab {
  url: string;
  title: string;
}

async function getActiveTabViaExtension(): Promise<ActiveTab | null> {
  let tabs: Awaited<ReturnType<typeof BrowserExtension.getTabs>>;
  try {
    tabs = await BrowserExtension.getTabs();
  } catch {
    // Browser extension not connected — fall back to AppleScript.
    return null;
  }
  const active = tabs.find((t) => t.active);
  if (!active?.url) return null;
  return { url: active.url, title: (active.title ?? "").trim() };
}

async function getActiveTabViaAppleScript(): Promise<ActiveTab | null> {
  const front = await getFrontmostApplication();
  const appName = front.name;

  let script: string;
  if (SAFARI_BROWSERS.has(appName)) {
    script = `
      tell application "${appName}"
        set theURL to URL of front document as string
        set theTitle to name of front document as string
        return theURL & "|||" & theTitle
      end tell
    `;
  } else if (CHROMIUM_BROWSERS.has(appName)) {
    script = `
      tell application "${appName}"
        set theURL to URL of active tab of front window as string
        set theTitle to title of active tab of front window as string
        return theURL & "|||" & theTitle
      end tell
    `;
  } else {
    return null;
  }

  try {
    const result = await runAppleScript(script);
    const [url, title] = result.split("|||");
    if (!url) return null;
    return { url: url.trim(), title: (title ?? "").trim() };
  } catch {
    return null;
  }
}

async function getActiveTab(): Promise<{
  tab: ActiveTab;
  source: string;
} | null> {
  // Prefer the Raycast browser extension: it returns the exact tab URL
  // regardless of browser, avoiding AppleScript quirks (e.g. Dia returns
  // only the host via `URL of active tab`).
  const fromExtension = await getActiveTabViaExtension();
  if (fromExtension) return { tab: fromExtension, source: "extension" };
  const fromAppleScript = await getActiveTabViaAppleScript();
  if (fromAppleScript) return { tab: fromAppleScript, source: "applescript" };
  return null;
}

export default async function Command() {
  const result = await getActiveTab();
  if (!result) {
    await showHUD(
      "⚠ Bring Safari, Chrome, Dia, Arc, Brave, or Edge to the front first.",
    );
    return;
  }
  const { tab, source } = result;

  // The AppleScript path on Dia only returns the bare host, not the article
  // URL. If we landed there, the browser extension isn't feeding us tabs.
  if (source === "applescript" && !/^https?:\/\/[^/]+\/.+/.test(tab.url)) {
    await showHUD(
      "⚠ Got only the site domain. Connect the Raycast browser extension in Dia, then retry.",
    );
    return;
  }

  let title = tab.title;
  if (titleLooksLikeDomain(title, tab.url)) {
    const fetched = await fetchPageTitle(tab.url);
    if (fetched) title = fetched;
  }

  try {
    await saveItem(tab.url, title);
    const displayTitle = title.length > 60 ? title.slice(0, 57) + "…" : title;
    await showHUD(`✓ Saved: ${displayTitle || tab.url}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Already saved.") {
      const shortUrl =
        tab.url.length > 60 ? tab.url.slice(0, 57) + "…" : tab.url;
      await showHUD(`Already saved: ${shortUrl}`);
    } else {
      await showHUD(`⚠ ${msg}`);
    }
  }
}
