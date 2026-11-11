// Finds the page to save: the URL typed as an argument, else the tab in the
// browser you are looking at, else a link you selected or copied.

import { BrowserExtension, Clipboard, environment, getFrontmostApplication, getSelectedText } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { asUrl } from "./logic";

export type Source = {
  url: string;
  title?: string;
  // The page as the browser rendered it, which gets paywalled and
  // logged-in pages right. Only tabs have it.
  html?: string;
  from: "argument" | "tab" | "selection" | "clipboard";
};

const MAX_HTML = 5 * 1024 * 1024;

const FRONT_DOCUMENT = (id: string) => `tell application id "${id}" to return URL of front document`;
const ACTIVE_TAB = (id: string) => `tell application id "${id}" to return URL of active tab of front window`;

// Browsers by bundle id, with the AppleScript that reads the front tab's
// URL where the browser has one. The others need Raycast's browser extension.
const BROWSERS: Record<string, ((id: string) => string) | null> = {
  "com.apple.Safari": FRONT_DOCUMENT,
  "com.apple.SafariTechnologyPreview": FRONT_DOCUMENT,
  "com.kagi.kagimacOS": FRONT_DOCUMENT,
  "com.google.Chrome": ACTIVE_TAB,
  "com.google.Chrome.canary": ACTIVE_TAB,
  "com.brave.Browser": ACTIVE_TAB,
  "com.microsoft.edgemac": ACTIVE_TAB,
  "com.vivaldi.Vivaldi": ACTIVE_TAB,
  "com.operasoftware.Opera": ACTIVE_TAB,
  "company.thebrowser.Browser": ACTIVE_TAB,
  "net.imput.helium": ACTIVE_TAB,
  "company.thebrowser.dia": null,
  "org.mozilla.firefox": null,
  "app.zen-browser.zen": null,
};

export async function findSource(argument: string | undefined, { withHtml }: { withHtml: boolean }): Promise<Source> {
  if (argument?.trim()) {
    const url = asUrl(argument);
    if (!url) throw new Error(`"${argument.trim()}" is not a URL`);
    return { url, from: "argument" };
  }

  const browser = await frontmostBrowser();
  const source = browser
    ? ((await fromTab(browser, withHtml)) ?? (await fromText()))
    : ((await fromText()) ?? (await fromTab(undefined, withHtml)));
  if (source) return source;

  throw new Error("Nothing to save. Type a URL, open a page in your browser, or copy a link.");
}

async function frontmostBrowser(): Promise<string | undefined> {
  try {
    const { bundleId } = await getFrontmostApplication();
    return bundleId && bundleId in BROWSERS ? bundleId : undefined;
  } catch {
    return undefined;
  }
}

async function fromText(): Promise<Source | undefined> {
  const selected = asUrl(await getSelectedText().catch(() => ""));
  if (selected) return { url: selected, from: "selection" };
  const copied = asUrl(await Clipboard.readText().catch(() => ""));
  if (copied) return { url: copied, from: "clipboard" };
  return undefined;
}

async function fromTab(browser: string | undefined, withHtml: boolean): Promise<Source | undefined> {
  if (!environment.canAccess(BrowserExtension)) {
    const url = asUrl(await scriptedUrl(browser));
    return url ? { url, from: "tab" } : undefined;
  }

  let tabs: BrowserExtension.Tab[];
  try {
    tabs = (await BrowserExtension.getTabs()).filter((tab) => tab.active && asUrl(tab.url));
  } catch {
    const url = asUrl(await scriptedUrl(browser));
    return url ? { url, from: "tab" } : undefined;
  }

  // Each browser window has an active tab, and Raycast's extension may live
  // in another browser than the one in front. Where the browser in front can
  // say which page it shows, only the tab with that URL is the one meant;
  // without a match that URL is saved on its own, with no other tab's HTML.
  const front = asUrl(await scriptedUrl(browser));
  const tab = front ? tabs.find((candidate) => asUrl(candidate.url) === front) : tabs[0];
  if (!tab) return front ? { url: front, from: "tab" } : undefined;

  const source: Source = { url: tab.url, title: tab.title, from: "tab" };
  if (withHtml) {
    try {
      const html = await BrowserExtension.getContent({ format: "html", tabId: tab.id });
      if (html && html.length <= MAX_HTML) source.html = html;
    } catch {
      // The server fetches the URL itself.
    }
  }
  return source;
}

async function scriptedUrl(browser: string | undefined): Promise<string | undefined> {
  const script = browser && BROWSERS[browser];
  if (!script || process.platform !== "darwin") return undefined;
  try {
    return await runAppleScript(script(browser));
  } catch {
    return undefined;
  }
}
