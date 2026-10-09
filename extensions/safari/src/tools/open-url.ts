import { open } from "@raycast/api";
import { setTimeout } from "timers/promises";
import { getFocusedTab, getTabCounts, resolveTab } from "../safari";
import { parseWebUrl } from "../url";
import { safariAppIdentifier } from "../utils";

const VERIFY_TIMEOUT_MS = 5000;
const VERIFY_POLL_MS = 250;

type Input = {
  /**
   * The URL to open.
   * @remarks
   * A web address starting with http:// or https://. A bare host such as "raycast.com" or "example.com:8080" is
   * opened over https, and a local host such as "localhost:3000" over http.
   */
  url: string;
};

/**
 * Opens a URL in Safari and returns the tab that shows it.
 * `verified` is true only when a new tab appeared and shows the requested site; it is false when no new tab
 * appeared or the new tab shows another site, for example after a redirect.
 */
export default async function tool(input: Input) {
  const url = parseWebUrl(input.url);
  const countsBefore = await getTabCounts().catch(() => ({}) as Record<number, number>);
  await open(url.href, safariAppIdentifier);

  const deadline = Date.now() + VERIFY_TIMEOUT_MS;
  let newTabAppeared = false;
  for (;;) {
    const countsAfter = await getTabCounts().catch(() => countsBefore);
    newTabAppeared = Object.keys(countsAfter).some((windowRef) => gainedTab(countsBefore, countsAfter, windowRef));
    if (newTabAppeared) {
      // The focused tab must be in the window that gained a tab, never an existing tab elsewhere
      const tab = await resolveTab().catch(() => undefined);
      if (tab && gainedTab(countsBefore, countsAfter, String(tab.windowRef)) && sameSite(tab.url, url)) {
        const focusedTab = await getFocusedTab();
        return { verified: true, tab: focusedTab };
      }
    }
    if (Date.now() >= deadline) break;
    await setTimeout(VERIFY_POLL_MS);
  }

  const focusedTab = await getFocusedTab().catch(() => undefined);
  if (!focusedTab) {
    throw new Error(`Safari did not open ${url.href}.`);
  }
  return {
    verified: false,
    reason: newTabAppeared ? "The new tab shows another site." : "Safari did not open a new tab.",
    requestedUrl: url.href,
    tab: focusedTab,
  };
}

// The window gained a tab, or it is a new window
function gainedTab(before: Record<number, number>, after: Record<number, number>, windowRef: string) {
  return (after[Number(windowRef)] ?? 0) > (before[Number(windowRef)] ?? 0);
}

function sameSite(tabUrl: string, url: URL) {
  try {
    const host = (hostname: string) => hostname.replace(/^www\./, "");
    return host(new URL(tabUrl).hostname) === host(url.hostname);
  } catch {
    return false;
  }
}
