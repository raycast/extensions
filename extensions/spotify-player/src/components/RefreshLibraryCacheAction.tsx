import { Action, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { YourLibrary } from "../helpers/YourLibrary";

export function RefreshLibraryCacheAction() {
  async function handleRefresh() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Refreshing library cache..." });
      await YourLibrary.getInstance().refresh();
      await showHUD("Library cache refreshed");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh cache",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return <Action icon={Icon.ArrowClockwise} title="Refresh Library Cache" onAction={handleRefresh} />;
}
