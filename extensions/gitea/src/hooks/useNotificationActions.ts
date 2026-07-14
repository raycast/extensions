import { showToast, Toast } from "@raycast/api";
import type { NotificationStatus } from "../domain/notification";
import { readAllNotifications, updateNotificationStatus } from "../services/notifications";

export function useNotificationActions() {
  const updateStatus = async (params: { id: string; toStatus: NotificationStatus }) =>
    updateNotificationStatus({ id: params.id, toStatus: params.toStatus });

  const readAll = async (...statusTypes: NotificationStatus[]) => readAllNotifications(...statusTypes);

  const runWithToast = async (promise: Promise<unknown>, messages: { success: string; failure: string }) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating..." });
    try {
      await promise;
      toast.style = Toast.Style.Success;
      toast.title = messages.success;
    } catch (err: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = messages.failure;
      toast.message = err instanceof Error ? err.message : String(err);
    }
  };

  return { updateStatus, readAll, runWithToast };
}
