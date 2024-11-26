import { Notification, getNotificationHtmlUrl } from "../../../notification";
import { Detail, ActionPanel, Action } from "@raycast/api";
import { useMemo } from "react";

interface SlackStarPreviewProps {
  notification: Notification;
}

export function SlackStarPreview({ notification }: SlackStarPreviewProps) {
  const notificationHtmlUrl = useMemo(() => {
    return getNotificationHtmlUrl(notification);
  }, [notification]);

  return (
    <Detail
      markdown={`# ${notification.title}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={notificationHtmlUrl} />
        </ActionPanel>
      }
    />
  );
}
