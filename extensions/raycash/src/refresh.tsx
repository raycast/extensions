import { showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { getAccountSet, requestsToday } from "./simplefin";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Fetching new balances...",
  });

  try {
    await getAccountSet(true);
    const calls = requestsToday();
    await updateCommandMetadata({ subtitle: `API Calls Today: ${calls} / 18` });

    toast.style = Toast.Style.Success;
    toast.title = "Balances refreshed successfully";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to refresh balances";
    toast.message = String(err);
  }
}
