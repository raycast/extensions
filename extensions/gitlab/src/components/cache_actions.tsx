import { ActionPanel, Color, Icon, showToast, ToastStyle } from "@raycast/api";
import { clearLargeObjectCache } from "../cache";
import { getErrorMessage } from "../utils";

export function ClearLocalCacheAction(): JSX.Element {
  async function handleAction() {
    try {
      clearLargeObjectCache();
      showToast(ToastStyle.Success, "Local Cache deleted");
    } catch (error) {
      showToast(ToastStyle.Failure, "Could not clear local cache", getErrorMessage(error));
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
