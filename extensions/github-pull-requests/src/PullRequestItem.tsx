import { preferences, List, Icon, ActionPanel, OpenInBrowserAction, CopyToClipboardAction } from "@raycast/api";
import { PullRequest } from "./types";

export default function PullRequestItem(pullRequest: PullRequest) {
  const username = preferences.username.value ?? "";
  const author = pullRequest.author?.login ?? "";
  const assignees = pullRequest.assignees?.nodes?.map((a) => a.login) ?? [];
  const reviewers = pullRequest.reviewRequests?.nodes?.map((r) => r.requestedReviewer.login) ?? [];

  let subtitle = "";

  if (assignees.length > 0) {
    subtitle += `A: ${assignees.join(", ")}`;
  }

  if (reviewers.length > 0) {
    if (subtitle.length > 0) {
      subtitle += " | ";
    }

    subtitle += `R: ${reviewers.join(", ")}`;
  }

  return (
    <List.Item
      id={pullRequest.url}
      key={pullRequest.url}
      title={pullRequest.title}
      subtitle={subtitle}
      accessoryTitle={author === username ? "" : author}
      icon={Icon.Binoculars}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={pullRequest.url} />
          <CopyToClipboardAction title="Copy URL" content={pullRequest.url} />
        </ActionPanel>
      }
    />
  );
}
