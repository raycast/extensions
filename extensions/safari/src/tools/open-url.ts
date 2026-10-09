import { open } from "@raycast/api";
import { setTimeout } from "timers/promises";
import { getFocusedTab } from "../safari";
import { safariAppIdentifier } from "../utils";

const VERIFY_TIMEOUT_MS = 5000;
const VERIFY_POLL_MS = 250;

type Input = {
  /**
   * The URL to open.
   * @remarks
   * A web address starting with http:// or https://. A bare domain such as "raycast.com" is opened over https.
   */
  url: string;
};

/**
 * Opens a URL in Safari and returns the tab that shows it.
 * `verified` is false when the focused tab shows another address, for example after a redirect to another site.
 */
export default async function tool(input: Input) {
  const url = parseWebUrl(input.url);
  // Safari may already show a tab on the same site, so remember which tab was focused
  const previousTab = await getFocusedTab().catch(() => undefined);
  await open(url.href, safariAppIdentifier);

  const deadline = Date.now() + VERIFY_TIMEOUT_MS;
  let focusedTab: FocusedTab | undefined;
  for (;;) {
    focusedTab = await getFocusedTab().catch(() => undefined);
    if (focusedTab && isOpenedTab(focusedTab, previousTab, url)) {
      return { verified: true, tab: focusedTab };
    }
    if (Date.now() >= deadline) break;
    await setTimeout(VERIFY_POLL_MS);
  }

  if (!focusedTab) {
    throw new Error(`Safari did not open ${url.href}.`);
  }
  return { verified: false, requestedUrl: url.href, tab: focusedTab };
}

function parseWebUrl(value: string) {
  const trimmed = value.trim();
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`"${value}" is not a valid URL.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`"${value}" is not a web URL. Only http:// and https:// addresses can be opened.`);
  }
  if (!url.hostname.includes(".") && url.hostname !== "localhost") {
    throw new Error(`"${value}" is not a valid URL.`);
  }
  return url;
}

type FocusedTab = Awaited<ReturnType<typeof getFocusedTab>>;

// The exact URL, or a redirect within the same site in a tab that was not focused before
function isOpenedTab(tab: FocusedTab, previousTab: FocusedTab | undefined, url: URL) {
  let tabUrl: URL;
  try {
    tabUrl = new URL(tab.url);
  } catch {
    return false;
  }
  if (tabUrl.href === url.href) return true;

  const host = (hostname: string) => hostname.replace(/^www\./, "");
  const isNewTab =
    !previousTab ||
    previousTab.window_id !== tab.window_id ||
    previousTab.index !== tab.index ||
    previousTab.url !== tab.url;
  return isNewTab && host(tabUrl.hostname) === host(url.hostname);
}
