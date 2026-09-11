import { showToast, Toast, updateCommandMetadata } from "@raycast/api";
import {
  formatRefreshTime,
  getAccountSet,
  requestsToday,
  MAX_REQUESTS_PER_DAY,
} from "./simplefin";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Fetching new balances...",
  });

  try {
    const accountSet = await getAccountSet(true);
    const calls = requestsToday();
    const timeStr = formatRefreshTime(accountSet.fetchedAt);
    await updateCommandMetadata({
      subtitle: `Last Refreshed: ${timeStr} • API Calls Today: ${calls} / 18`,
    });

    if (accountSet.fromCache) {
      toast.style = Toast.Style.Failure;
      if (calls >= 24) {
        toast.title = "Daily API limit reached (24 / 24)";
        toast.message =
          "SimpleFIN hard daily limit reached. Please wait until tomorrow.";
      } else if (calls >= MAX_REQUESTS_PER_DAY) {
        toast.title = "Daily API limit reached (18 / 18)";
        toast.message = "Requests are capped to protect your SimpleFIN quota.";
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
