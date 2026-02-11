import { getNotificationHtmlUrl, Notification } from "../../../notification";
import { Detail, ActionPanel, Action } from "@raycast/api";
import { useMemo } from "react";

interface TodoistTaskPreviewProps {
  notification: Notification;
}

export function TodoistTaskPreview({ notification }: TodoistTaskPreviewProps) {
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
