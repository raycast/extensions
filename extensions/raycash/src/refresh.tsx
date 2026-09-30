import { showToast, Toast, updateCommandMetadata } from "@raycast/api";
import {
  formatRefreshTime,
  getAccountSet,
  repaintMenuBar,
  requestsToday,
  MAX_REQUESTS_PER_DAY,
} from "./simplefin";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Fetching new balances...",
  });

  try {
    const started = Date.now();
    const accountSet = await getAccountSet(true);
    const calls = requestsToday();
    const timeStr = formatRefreshTime(accountSet.fetchedAt);
    await updateCommandMetadata({
      subtitle: `Last Refreshed: ${timeStr} • API Calls Today: ${calls} / ${MAX_REQUESTS_PER_DAY}`,
    });

    // Update the other surface too, so the menu bar and this subtitle agree.
    // Only after a real fetch: it just reset the cache age to zero, so the
    // repaint's launch serves the cache. A cached result can be a failed
    // fetch, whose cache is still old enough that the repaint would go
    // straight back to the network for a second attempt.
    if (!accountSet.fromCache) await repaintMenuBar();

    if (accountSet.fromCache) {
      toast.style = Toast.Style.Failure;
      if (accountSet.failure && accountSet.failure.at >= started) {
        toast.title = "Refresh failed, showing cached balances";
        toast.message = accountSet.failure.message;
      } else if (calls >= MAX_REQUESTS_PER_DAY) {
        toast.title = `Daily API limit reached (${calls} / ${MAX_REQUESTS_PER_DAY})`;
        toast.message =
          "Requests are capped to protect your SimpleFIN quota. The count resets at midnight UTC.";
      } else {
        const minsAgo = Math.round((Date.now() - accountSet.fetchedAt) / 60000);
        toast.title = `Recently refreshed (${minsAgo}m ago)`;
        toast.message = "Minimum interval between refreshes is 20 minutes.";
      }
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Balances refreshed successfully";
    }
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to refresh balances";
    toast.message = String(err);
  }
}
