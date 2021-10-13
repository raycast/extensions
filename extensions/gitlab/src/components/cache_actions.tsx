import { ActionPanel, Color, Icon, showToast, ToastStyle } from "@raycast/api";
import { clearLargeObjectCache } from "../cache";

export function ClearLocalCacheAction() {
  async function handleAction() {
    try {
      clearLargeObjectCache();
      showToast(ToastStyle.Success, "Local Cache deleted");
    } catch (error: any) {
      showToast(
        ToastStyle.Failure,
        "Could not clear local cache",
        error instanceof Error ? error.message : error.toString()
      );
    }
  }
  return (
    <ActionPanel.Item
      title="Clear local cache"
      icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
      onAction={handleAction}
    />
  );
}
