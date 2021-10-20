import { preferences, List, Icon, ActionPanel, OpenInBrowserAction, CopyToClipboardAction } from "@raycast/api";
import { PullRequest } from "./types";

export default function PullRequestItem(pullRequest: PullRequest) {
  const username = preferences.username.value ?? "";
  const author = pullRequest.author?.login ?? "";
  const reviewers = pullRequest.reviewRequests?.nodes?.map((r) => r.requestedReviewer.login) ?? [];

  return (
    <List.Item
      id={pullRequest.url}
      key={pullRequest.url}
      title={pullRequest.title}
      subtitle={reviewers.length === 0 ? "" : `${reviewers.join(", ")}`}
      accessoryTitle={author === username ? "" : author}
      icon={{ source: Icon.Binoculars, tintColor: "green" }}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={pullRequest.url} />
          <CopyToClipboardAction title="Copy URL" content={pullRequest.url} />
        </ActionPanel>
      }
    />
  );
}
