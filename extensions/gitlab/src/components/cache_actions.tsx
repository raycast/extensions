import { Action, Color, Icon, showToast, Toast } from "@raycast/api";
import { clearLargeObjectCache } from "../cache";
import { getErrorMessage, showErrorToast } from "../utils";

export function ClearLocalCacheAction(): JSX.Element {
  async function handleAction() {
    try {
      clearLargeObjectCache();
      showToast(Toast.Style.Success, "Local Cache deleted");
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Could not clear local cache");
    }
  }
  return (
    <Action
      title="Clear local cache"
      icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
      onAction={handleAction}
    />
  );
}
