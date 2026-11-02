import { BrowserExtension, Clipboard, environment, getSelectedText } from "@raycast/api";
import { getLogger } from "./logger";
import { urlFromAmbientText } from "./urlText";

const log = getLogger("input");

export type UrlSource = "selection" | "clipboard" | "tab";

/**
 * One place Digger looked for a URL. Three outcomes, not two: a clipboard that
 * holds no URL is an answer, a browser extension that could not be reached is
 * not, and the view says which.
 */
export type SourceResult =
  | { source: UrlSource; outcome: "found"; url: string }
  | { source: UrlSource; outcome: "absent"; detail: string }
  | { source: UrlSource; outcome: "unavailable"; error: string };

export type UrlReader = () => Promise<SourceResult>;

/** Lowercase, to sit inside a sentence: "couldn't read the clipboard". */
export const SOURCE_NAME: Record<UrlSource, string> = {
  selection: "selection",
  clipboard: "clipboard",
  tab: "browser tab",
};

const HOST_API_TIMEOUT_MS = 3000;
const isWindows = process.platform === "win32";

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** `getSelectedText` can hang on Windows without accessibility permission, and `getTabs` when the browser is busy. */
function withTimeout<T>(promise: Promise<T>, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${what} didn't answer within ${HOST_API_TIMEOUT_MS / 1000}s`)),
      HOST_API_TIMEOUT_MS,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function fromSelection(): Promise<SourceResult> {
  let text: string;
  try {
    text = await withTimeout(getSelectedText(), "The frontmost app");
  } catch (error) {
    // Raycast rejects both when nothing is selected and when it could not read
    // the selection, and only its message tells them apart. The known
    // nothing-selected message is an answer; any other is a failure to read.
    log.log("selection:unreadable", { error: message(error) });
    if (/cannot copy selected text/i.test(message(error)))
      return { source: "selection", outcome: "absent", detail: "nothing is selected" };
    return { source: "selection", outcome: "unavailable", error: message(error) };
  }
  if (!text.trim()) return { source: "selection", outcome: "absent", detail: "nothing is selected" };
  const url = urlFromAmbientText(text);
  return url
    ? { source: "selection", outcome: "found", url }
    : { source: "selection", outcome: "absent", detail: "the selection isn't a URL" };
}

export async function fromClipboard(): Promise<SourceResult> {
  let text: string | undefined;
  try {
    text = await Clipboard.readText();
  } catch (error) {
    log.warn("clipboard:unreadable", { error: message(error) });
    return { source: "clipboard", outcome: "unavailable", error: message(error) };
  }
  if (!text?.trim()) return { source: "clipboard", outcome: "absent", detail: "the clipboard is empty" };
  const url = urlFromAmbientText(text);
  return url
    ? { source: "clipboard", outcome: "found", url }
    : { source: "clipboard", outcome: "absent", detail: "the clipboard has no URL" };
}

/** Whether the active-tab reader can work at all here. */
export function canReadBrowserTab(): boolean {
  return !isWindows && environment.canAccess(BrowserExtension);
}

export const BROWSER_EXTENSION_MISSING = isWindows
  ? "The Raycast browser extension isn't available on Windows yet"
  : "Needs the Raycast browser extension";

export async function fromBrowserTab(): Promise<SourceResult> {
  if (!canReadBrowserTab()) return { source: "tab", outcome: "unavailable", error: BROWSER_EXTENSION_MISSING };
  let tabs: Awaited<ReturnType<typeof BrowserExtension.getTabs>>;
  try {
    tabs = await withTimeout(BrowserExtension.getTabs(), "The browser");
  } catch (error) {
    log.warn("tab:unreadable", { error: message(error) });
    return { source: "tab", outcome: "unavailable", error: message(error) };
  }
  const active = tabs.find((tab) => tab.active);
  if (!active) return { source: "tab", outcome: "absent", detail: "no browser tab is active" };
  let protocol: string;
  try {
    protocol = new URL(active.url).protocol;
  } catch {
    return { source: "tab", outcome: "absent", detail: "the current tab isn't a website" };
  }
  // chrome://newtab, about:blank, file:// — a page, but not one Digger can fetch.
  if (protocol !== "http:" && protocol !== "https:")
    return { source: "tab", outcome: "absent", detail: `the current tab is a ${protocol} page, not a website` };
  return { source: "tab", outcome: "found", url: active.url };
}
