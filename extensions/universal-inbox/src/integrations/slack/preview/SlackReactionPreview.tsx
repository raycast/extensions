import { getNotificationHtmlUrl, Notification } from "../../../notification";
import { Detail, ActionPanel, Action } from "@raycast/api";
import { SlackReaction } from "../types";
import { useMemo } from "react";

interface SlackReactionPreviewProps {
  notification: Notification;
  slack_reaction: SlackReaction;
}

export function SlackReactionPreview({ notification }: SlackReactionPreviewProps) {
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
