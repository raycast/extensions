import { ActionPanel, Action, showToast, Toast, confirmAlert, Alert, Icon, List } from "@raycast/api";
import { clearHighlights } from "./utils/storage";

import { isProUser } from "./utils/auth";

export default function Command() {
  const handleClear = async () => {
    const isPro = await isProUser();
    const message = isPro
      ? "This will clear local storage, but your cloud-synced data will remain available."
      : "This will clear local storage. Your backup data (if created) will remain in the cloud.";

    if (
      await confirmAlert({
        title: "Clear All Highlights?",
        message,
        primaryAction: { title: "Clear All", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await clearHighlights();
        await showToast({ style: Toast.Style.Success, title: "Storage Cleared" });
      } catch (e) {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: String(e) });
      }
    }
  };

  return (
    <List>
      <List.EmptyView
        icon={Icon.Trash}
        title="Clear Local Storage"
        description="This action cannot be undone."
        actions={
          <ActionPanel>
            <Action
              title="Clear Local Storage"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleClear}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
