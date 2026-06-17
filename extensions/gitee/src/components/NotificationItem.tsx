import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import React from "react";
import { Notification } from "../types/notification";
import { setNotificationRead } from "../hooks/hooks";
import Mask = Image.Mask;

export function NotificationItem(props: {
  notification: Notification;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { notification: notification, setRefresh } = props;
  return (
    <List.Item
      id={notification.id + ""}
      key={notification.id + ""}
      icon={{ source: notification.actor.avatar_url, mask: Mask.Circle }}
      title={notification.content}
      subtitle={notification.repository.human_name}
      accessories={[
        {
          text: notification.updated_at.substring(0, 10),
          tooltip: "Updated: " + notification.updated_at.replace("T", " ").substring(0, 19),
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={notification.content}>
            <Action.OpenInBrowser url={notification.html_url} />
            <Action
              icon={Icon.Circle}
              title={"Mark as read"}
              onAction={async () => {
                setRefresh(await setNotificationRead(notification.id));
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
