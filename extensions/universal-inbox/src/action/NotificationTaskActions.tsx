import { deleteNotification, snoozeNotification, unsubscribeFromNotification } from "./NotificationActions";
import { Notification, getNotificationHtmlUrl, isNotificationBuiltFromTask } from "../notification";
import { Action, ActionPanel, Icon, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { Page, UniversalInboxPreferences } from "../types";
import { MutatePromise } from "@raycast/utils";
import { useMemo, ReactElement } from "react";
import { PlanTask } from "./PlanTask";
import { handleErrors } from "../api";
import { TaskStatus } from "../task";
import fetch from "node-fetch";

interface NotificationTaskActionsProps {
  notification: Notification;
  detailsTarget: ReactElement;
  mutate: MutatePromise<Page<Notification> | undefined>;
}

export function NotificationTaskActions({ notification, detailsTarget, mutate }: NotificationTaskActionsProps) {
  const notificationHtmlUrl = useMemo(() => {
    return getNotificationHtmlUrl(notification);
  }, [notification]);

  return (
    <ActionPanel>
      <Action.OpenInBrowser url={notificationHtmlUrl} />
      <Action.Push title="Show Details" icon={Icon.AppWindowSidebarRight} target={detailsTarget} />
      <Action
        title="Delete Notification"
        icon={Icon.Trash}
        shortcut={{ modifiers: ["ctrl"], key: "d" }}
        onAction={() => deleteNotification(notification, mutate)}
      />
      <Action
        title="Unsubscribe from Notification"
        icon={Icon.BellDisabled}
        shortcut={{ modifiers: ["ctrl"], key: "u" }}
        onAction={() => unsubscribeFromNotification(notification, mutate)}
      />
      <Action
        title="Snooze"
        icon={Icon.Clock}
        shortcut={{ modifiers: ["ctrl"], key: "s" }}
        onAction={() => snoozeNotification(notification, mutate)}
      />
      <Action
        title="Complete Task"
        icon={Icon.CheckCircle}
        shortcut={{ modifiers: ["ctrl"], key: "c" }}
        onAction={() => completeTask(notification, mutate)}
      />
      <Action.Push
        title="Plan Task…"
        icon={Icon.Calendar}
        shortcut={{ modifiers: ["ctrl"], key: "t" }}
        target={<PlanTask notification={notification} mutate={mutate} />}
      />
    </ActionPanel>
  );
}

async function completeTask(notification: Notification, mutate: MutatePromise<Page<Notification> | undefined>) {
  if (!isNotificationBuiltFromTask(notification) || !notification.task) {
    return;
  }

  const preferences = getPreferenceValues<UniversalInboxPreferences>();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Marking task as Done" });
  try {
    await mutate(
      handleErrors(
        fetch(`${preferences.universalInboxBaseUrl.replace(/\/$/, "")}/api/tasks/${notification.task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: TaskStatus.Done }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${preferences.apiKey}`,
          },
        }),
      ),
      {
        optimisticUpdate(page) {
          if (page) {
            page.content = page.content.filter((n) => n.id !== notification.id);
          }
          return page;
        },
      },
    );

    toast.style = Toast.Style.Success;
    toast.title = "Task successfully marked as Done";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to mark task as Done";
    toast.message = (error as Error).message;
    throw error;
  }
}
