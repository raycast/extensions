import { open } from "@raycast/api";
import { setTimeout } from "timers/promises";
import { getTabSnapshot } from "../safari";
import { checkOpenedTab, NewTab, OpenCheck } from "../tab-snapshot";
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
 * Opens a URL in Safari and returns the new tab that shows it.
 * `verified` is true only when exactly one new tab appeared and it shows the requested site. Otherwise it is false,
 * with a `reason`, and `tab` is the new tab only when one could be identified.
 */
export default async function tool(input: Input) {
  const url = parseWebUrl(input.url);
  const before = await getTabSnapshot().catch(() => undefined);
  await open(url.href, safariAppIdentifier);

  const deadline = Date.now() + VERIFY_TIMEOUT_MS;
  let check: OpenCheck;
  for (;;) {
    const after = before && (await getTabSnapshot().catch(() => undefined));
    check = checkOpenedTab(before, after, url);
    // Stop as soon as it is verified, or when no later snapshot can change the answer
    if (check.verified || !before || Date.now() >= deadline) break;
    // A new tab can briefly show no address before it starts loading
    await setTimeout(VERIFY_POLL_MS);
  }

  // Return exactly the tab that was checked, without reading Safari again
  return check.verified
    ? { verified: true, tab: toLocalTab(check.tab) }
    : {
        verified: false,
        reason: check.reason,
        requestedUrl: url.href,
        ...(check.tab && { tab: toLocalTab(check.tab) }),
      };
}

function toLocalTab(tab: NewTab) {
  return {
    uuid: `${tab.windowId}-${tab.index}`,
    title: tab.title,
    url: tab.url,
    window_id: tab.windowId,
    index: tab.index,
    is_local: true,
  };
}
