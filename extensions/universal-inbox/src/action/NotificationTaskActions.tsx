import { Notification, getNotificationHtmlUrl } from "../notification";
import { Action, ActionPanel, Icon } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { useMemo, ReactElement } from "react";
import { Page } from "../types";

function deleteNotification(notification: Notification) {
  console.log(`Deleting notification ${notification.id}`);
}

function unsubscribeFromNotification(notification: Notification) {
  console.log(`Unsubcribing from notification ${notification.id}`);
}

function snoozeNotification(notification: Notification) {
  console.log(`Snoozing notification ${notification.id}`);
}

function completeTask(notification: Notification) {
  console.log(`Completing task ${notification.id}`);
}

interface NotificationTaskActionsProps {
  notification: Notification;
  detailsTarget: ReactElement;
  mutate: MutatePromise<Page<Notification> | undefined>;
}

export function NotificationTaskActions({ notification, detailsTarget }: NotificationTaskActionsProps) {
  const notificationHtmlUrl = useMemo(() => {
    return getNotificationHtmlUrl(notification);
  }, [notification]);

  return (
    <ActionPanel>
      <Action.OpenInBrowser url={notificationHtmlUrl} />
      <Action.Push title="Show Details" target={detailsTarget} />
      <Action
        title="Delete Notification"
        icon={Icon.Trash}
        shortcut={{ modifiers: ["ctrl"], key: "d" }}
        onAction={() => deleteNotification(notification)}
      />
      <Action
        title="Unsubscribe From Notification"
        icon={Icon.BellDisabled}
        shortcut={{ modifiers: ["ctrl"], key: "u" }}
        onAction={() => unsubscribeFromNotification(notification)}
      />
      <Action
        title="Snooze"
        icon={Icon.Clock}
        shortcut={{ modifiers: ["ctrl"], key: "s" }}
        onAction={() => snoozeNotification(notification)}
      />
      <Action
        title="Complete Task"
        icon={Icon.Calendar}
        shortcut={{ modifiers: ["ctrl"], key: "c" }}
        onAction={() => completeTask(notification)}
      />
    </ActionPanel>
  );
}
