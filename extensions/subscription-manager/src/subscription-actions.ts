import { Alert, Toast, confirmAlert, popToRoot, showToast } from "@raycast/api";

export async function confirmAndDeleteSubscription(name: string, deleteFn: () => Promise<void>): Promise<void> {
  const confirmed = await confirmAlert({
    title: `Delete "${name}"?`,
    message: "This action cannot be undone.",
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
  if (confirmed) {
    await deleteFn();
    await showToast({ style: Toast.Style.Success, title: "Subscription Deleted" });
    await popToRoot();
  }
}
