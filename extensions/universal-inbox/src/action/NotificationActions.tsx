import { Notification, NotificationStatus, getNotificationHtmlUrl, isNotificationBuiltFromTask } from "../notification";
import { Action, ActionPanel, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { CreateTaskFromNotification } from "./CreateTaskFromNotification";
import { LinkNotificationToTask } from "./LinkNotificationToTask";
import { Page, UniversalInboxPreferences } from "../types";
import { default as dayjs, extend } from "dayjs";
import { MutatePromise } from "@raycast/utils";
import { useMemo, ReactElement } from "react";
import { handleErrors } from "../api";
import { TaskStatus } from "../task";
import utc from "dayjs/plugin/utc";
import fetch from "node-fetch";

extend(utc);

interface NotificationActionsProps {
  notification: Notification;
  detailsTarget: ReactElement;
  mutate: MutatePromise<Page<Notification> | undefined>;
}

export function NotificationActions({ notification, detailsTarget, mutate }: NotificationActionsProps) {
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
      <Action.Push
        title="Create Task…"
        icon={Icon.Calendar}
        shortcut={{ modifiers: ["ctrl"], key: "t" }}
        target={<CreateTaskFromNotification notification={notification} mutate={mutate} />}
      />
      <Action.Push
        title="Link to Task…"
        icon={Icon.Link}
        shortcut={{ modifiers: ["ctrl"], key: "l" }}
        target={<LinkNotificationToTask notification={notification} mutate={mutate} />}
      />
    </ActionPanel>
  );
}

export async function deleteNotification(
  notification: Notification,
  mutate: MutatePromise<Page<Notification> | undefined>,
) {
  const preferences = getPreferenceValues<UniversalInboxPreferences>();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting notification" });
  try {
    if (isNotificationBuiltFromTask(notification) && notification.task) {
      await mutate(
        handleErrors(
          fetch(`${preferences.universalInboxBaseUrl.replace(/\/$/, "")}/api/tasks/${notification.task.id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: TaskStatus.Deleted }),
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
    } else {
      await mutate(
        handleErrors(
          fetch(`${preferences.universalInboxBaseUrl.replace(/\/$/, "")}/api/notifications/${notification.id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: NotificationStatus.Deleted }),
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
    }

    toast.style = Toast.Style.Success;
    toast.title = "Notification successfully deleted";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to delete notification";
    toast.message = (error as Error).message;
    throw error;
  }
}

export async function unsubscribeFromNotification(
  notification: Notification,
  mutate: MutatePromise<Page<Notification> | undefined>,
) {
  const preferences = getPreferenceValues<UniversalInboxPreferences>();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Unsubscribing from notification" });
  try {
    await mutate(
      handleErrors(
        fetch(`${preferences.universalInboxBaseUrl.replace(/\/$/, "")}/api/notifications/${notification.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: NotificationStatus.Unsubscribed }),
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
    toast.title = "Notification successfully unsubscribed";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to unsubscribe from notification";
    toast.message = (error as Error).message;
    throw error;
  }
}

export async function snoozeNotification(
  notification: Notification,
  mutate: MutatePromise<Page<Notification> | undefined>,
) {
  const preferences = getPreferenceValues<UniversalInboxPreferences>();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Snoozing notification" });
  try {
    const snoozeTime = computeSnoozedUntil(new Date(), 1, 6);
    await mutate(
      handleErrors(
        fetch(`${preferences.universalInboxBaseUrl.replace(/\/$/, "")}/api/notifications/${notification.id}`, {
          method: "PATCH",
          body: JSON.stringify({ snoozed_until: snoozeTime }),
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
    toast.title = "Notification successfully snoozed";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to snooze notification";
    toast.message = (error as Error).message;
    throw error;
  }
}

function computeSnoozedUntil(fromDate: Date, daysOffset: number, resetHour: number): Date {
  const result = dayjs(fromDate)
    .utc()
    .add(fromDate.getHours() < resetHour ? daysOffset - 1 : daysOffset, "day");
  return result.hour(resetHour).minute(0).second(0).millisecond(0).toDate();
}
