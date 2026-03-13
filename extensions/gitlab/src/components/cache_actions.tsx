import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { clearLargeObjectCache } from "../cache";
import { getErrorMessage, showErrorToast } from "../utils";

export function ClearLocalCacheAction() {
  async function handleAction() {
    try {
      if (
        await confirmAlert({
          title: "Clear the Local Cache of the GitLab Extension?",
          message:
            "This delete the whole cache data of all GitLab commands. This does not destroy any data on your GitLab instance and all your extension settings are untouched",
          primaryAction: { title: "Delete Cache", style: Alert.ActionStyle.Destructive },
        })
      ) {
        clearLargeObjectCache();
        showToast(Toast.Style.Success, "Local Extension Cache cleared");
        popToRoot();
      }
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Could not clear local cache");
    }
  }
  return (
    <Action
      title="Clear Local Extension Cache"
      icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
      onAction={handleAction}
    />
  );
}

export function CacheActionPanelSection() {
  return (
    <ActionPanel.Section title="Cache">
      <ClearLocalCacheAction />
    </ActionPanel.Section>
  );
}
