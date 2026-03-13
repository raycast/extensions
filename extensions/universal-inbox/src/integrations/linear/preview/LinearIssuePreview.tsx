import { getNotificationHtmlUrl, Notification } from "../../../notification";
import { Detail, ActionPanel, Action } from "@raycast/api";
import { LinearIssue } from "../types";
import { useMemo } from "react";

interface LinearIssuePreviewProps {
  notification: Notification;
  linearIssue: LinearIssue;
}

export function LinearIssuePreview({ notification, linearIssue }: LinearIssuePreviewProps) {
  const notificationHtmlUrl = useMemo(() => {
    return getNotificationHtmlUrl(notification);
  }, [notification]);

  return (
    <Detail
      markdown={`# ${linearIssue.title}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={notificationHtmlUrl} />
        </ActionPanel>
      }
    />
  );
}
