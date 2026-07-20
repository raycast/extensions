import { Action, ActionPanel, List, Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getNotifications, notificationAction, dismissNotification, Notification } from "./utils/applescript";
import React from "react";
import ReplyNotification from "./reply-notification";

export default function Command() {
  const { data: notifications, isLoading, error, revalidate } = usePromise(getNotifications);

  const handleButtonAction = async (notification: Notification, actionName: string) => {
    try {
      if (!notification.id) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Action Failed",
          message: "Notification ID not available",
        });
        return;
      }

      const response = await notificationAction(notification.id, actionName);

      if (typeof response === "string") {
        // Error message
        await showToast({
          style: Toast.Style.Failure,
          title: "Action Failed",
          message: response,
        });
      } else if (response.status === "success") {
        await showToast({
          style: Toast.Style.Success,
          title: "Action Completed",
          message: response.message,
        });
        revalidate();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Action Failed",
          message: response.message,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Action Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDismiss = async (notification: Notification) => {
    try {
      if (!notification.id) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Dismiss",
          message: "Notification ID not available",
        });
        return;
      }

      const response = await dismissNotification(notification.id);

      if (typeof response === "string") {
        // Error message
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Dismiss",
          message: response,
        });
      } else if (response.status === "success") {
        await showToast({
          style: Toast.Style.Success,
          title: "Notification Dismissed",
          message: response.message,
        });
        revalidate();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Dismiss",
          message: response.message,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Dismiss",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={revalidate} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!notifications || notifications.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Bell}
          title="No Notifications"
          description="There are no notifications from your device"
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={revalidate} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {notifications.map((notification: Notification) => {
        // Create app icon from base64 or use default
        const appIcon = notification.app_icon_base64
          ? `data:image/png;base64,${notification.app_icon_base64}`
          : Icon.Bell;

        // Find reply action
        const replyAction = notification.actions?.find((action) => action.type === "reply");
        // Find button actions
        const buttonActions = notification.actions?.filter((action) => action.type === "button") || [];

        return (
          <List.Item
            icon={appIcon}
            title={`${notification.app} • ${notification.title || "No Title"}`}
            subtitle={notification.body}
            detail={<List.Item.Detail markdown={`# ${notification.title || "No Title"}\n\n${notification.body}`} />}
            actions={
              <ActionPanel>
                {replyAction && (
                  <Action.Push
                    title={replyAction.name}
                    icon={Icon.Message}
                    target={
                      <ReplyNotification
                        notification={notification}
                        actionName={replyAction.name}
                        onSuccess={revalidate}
                      />
                    }
                  />
                )}
                {buttonActions.map((action) => (
                  <Action
                    title={action.name}
                    icon={Icon.Checkmark}
                    onAction={() => handleButtonAction(notification, action.name)}
                  />
                ))}
                <ActionPanel.Section>
                  <Action
                    title="Dismiss Notification"
                    icon={Icon.XMarkCircle}
                    onAction={() => handleDismiss(notification)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Body"
                    content={notification.body}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy All"
                    content={`${notification.title}\n${notification.body}\n\nApp: ${notification.app}`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Refresh"
                    onAction={revalidate}
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
