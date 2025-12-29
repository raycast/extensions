import { LocalStorage, showToast, Toast, launchCommand, LaunchType, confirmAlert, Alert } from "@raycast/api";

export default async function Command() {
  const confirmed = await confirmAlert({
    title: "Clear All Data",
    message: "This will delete all saved projects. This action cannot be undone.",
    primaryAction: {
      title: "Clear All",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) {
    return;
  }

  await LocalStorage.clear();
  await showToast({
    style: Toast.Style.Success,
    title: "All project data cleared",
    message: "Remember to delete quicklinks manually",
    primaryAction: {
      title: "Manage Quicklinks",
      onAction: async () => {
        await launchCommand({
          ownerOrAuthorName: "raycast",
          extensionName: "raycast",
          name: "manage-quicklinks",
          type: LaunchType.UserInitiated,
        });
      },
    },
  });
}
