import { getNotificationHtmlUrl, Notification } from "../../../notification";
import { Detail, ActionPanel, Action } from "@raycast/api";
import { GithubDiscussion } from "../types";
import { useMemo } from "react";

interface GithubDiscussionPreviewProps {
  notification: Notification;
  githubDiscussion: GithubDiscussion;
}

export function GithubDiscussionPreview({ notification, githubDiscussion }: GithubDiscussionPreviewProps) {
  const notificationHtmlUrl = useMemo(() => {
    return getNotificationHtmlUrl(notification);
  }, [notification]);

  return (
    <Detail
      markdown={`# ${githubDiscussion.title}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={notificationHtmlUrl} />
        </ActionPanel>
      }
    />
  );
}
