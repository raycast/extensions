import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { katoApi } from "./api";
import { CreateTaskForm } from "./create-task";
import type { KatoNotification } from "./types";

export function NotificationActions({
  notification,
  onRead,
  onUnread,
  onDismissed,
  onMarkAllRead,
  detailToggle,
}: {
  notification: KatoNotification;
  onRead?: () => void;
  onUnread?: () => void;
  onDismissed?: () => void;
  onMarkAllRead?: () => void | Promise<void>;
  detailToggle?: { isShowing: boolean; onToggle: () => void };
}) {
  async function markRead() {
    onRead?.();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Marking notification read…",
    });
    try {
      await katoApi.markNotificationRead(notification.id);
      toast.style = Toast.Style.Success;
      toast.title = "Notification marked read";
      toast.primaryAction = {
        title: "Undo",
        onAction: async () => {
          await katoApi.markNotificationUnread(notification.id);
          onUnread?.();
        },
      };
    } catch (cause) {
      onUnread?.();
      toast.style = Toast.Style.Failure;
      toast.title = "Could not mark notification read";
      toast.message = (cause as Error).message;
    }
  }

  async function markUnread() {
    try {
      await katoApi.markNotificationUnread(notification.id);
      onUnread?.();
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not mark notification unread",
        message: (cause as Error).message,
      });
    }
  }

  async function dismiss() {
    onDismissed?.();
    try {
      await katoApi.dismissNotification(notification.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Notification dismissed",
      });
    } catch (cause) {
      onUnread?.();
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not dismiss notification",
        message: (cause as Error).message,
      });
    }
  }

  const context =
    notification.entityType === "record"
      ? { recordId: notification.entityId }
      : notification.entityType === "meeting"
        ? { meetingId: notification.entityId }
        : {};

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {detailToggle && !detailToggle.isShowing ? (
          <Action
            title="Show Details"
            icon={Icon.Sidebar}
            onAction={detailToggle.onToggle}
          />
        ) : null}
        {notification.webUrl ? (
          <Action.OpenInBrowser
            title="Open in Kato"
            icon={Icon.Globe}
            url={notification.webUrl}
          />
        ) : null}
        {detailToggle?.isShowing ? (
          <Action
            title="Hide Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={detailToggle.onToggle}
          />
        ) : null}
        {!notification.isRead ? (
          <Action
            title="Mark Read"
            icon={Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => void markRead()}
          />
        ) : (
          <Action
            title="Mark Unread"
            icon={Icon.Circle}
            onAction={() => void markUnread()}
          />
        )}
        <Action.Push
          title="Create Task"
          icon={Icon.Plus}
          target={
            <CreateTaskForm
              context={{
                ...context,
                label: notification.title,
                suggestedTitle: notification.title,
              }}
            />
          }
        />
        {onMarkAllRead ? (
          <Action
            title="Mark All Read"
            icon={Icon.Checkmark}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onAction={() => void onMarkAllRead()}
          />
        ) : null}
      </ActionPanel.Section>
      {notification.isRead ? (
        <ActionPanel.Section>
          <Action
            title="Dismiss Notification"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => void dismiss()}
          />
        </ActionPanel.Section>
      ) : null}
    </ActionPanel>
  );
}
