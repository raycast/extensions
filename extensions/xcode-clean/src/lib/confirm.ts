import { Alert, confirmAlert, getPreferenceValues } from "@raycast/api";

export async function confirmIfNeeded(
  message: string,
  title = "Confirm Deletion",
): Promise<boolean> {
  const { confirmBeforeDelete } = getPreferenceValues<Preferences>();
  if (!confirmBeforeDelete) return true;
  return await confirmAlert({
    title,
    message,
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    dismissAction: { title: "Cancel" },
  });
}
