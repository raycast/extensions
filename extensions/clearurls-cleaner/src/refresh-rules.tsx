import { showHUD, showToast, Toast } from "@raycast/api";
import { fetchRules } from "./cache";

export default async function Command() {
  try {
    await fetchRules();
    await showHUD("ClearURLs rules refreshed");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to refresh ClearURLs rules",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
