import { getNotificationHtmlUrl, Notification } from "../../../notification";
import { Detail, ActionPanel, Action } from "@raycast/api";
import { SlackThread } from "../types";
import { useMemo } from "react";

interface SlackThreadPreviewProps {
  notification: Notification;
  slack_thread: SlackThread;
}

export function SlackThreadPreview({ notification }: SlackThreadPreviewProps) {
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
