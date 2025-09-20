import { getNotificationHtmlUrl, Notification } from "../../../notification";
import { Detail, ActionPanel, Action } from "@raycast/api";
import { GithubPullRequest } from "../types";
import { useMemo } from "react";

interface GithubPullRequestPreviewProps {
  notification: Notification;
  githubPullRequest: GithubPullRequest;
}

export function GithubPullRequestPreview({ notification, githubPullRequest }: GithubPullRequestPreviewProps) {
  const notificationHtmlUrl = useMemo(() => {
    return getNotificationHtmlUrl(notification);
  }, [notification]);

  return (
    <Detail
      markdown={`# ${githubPullRequest.title}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={notificationHtmlUrl} />
        </ActionPanel>
      }
    />
  );
}
