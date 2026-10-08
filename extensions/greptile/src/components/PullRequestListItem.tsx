import { Action, ActionPanel, Icon, List } from "@raycast/api";

import {
  formatDate,
  formatPullRequestNumber,
  formatRepository,
  getPullRequestUrl,
  pullRequestIcon,
  pullRequestStateAccessory,
} from "../helpers/format";
import { MergeRequest } from "../types";
import { PullRequestDetail } from "./PullRequestDetail";

export function PullRequestListItem({
  pullRequest,
}: {
  pullRequest: MergeRequest;
}) {
  const repository = formatRepository(pullRequest.repository);
  const prNumber = formatPullRequestNumber(pullRequest.number);
  const url = getPullRequestUrl(
    pullRequest.repository,
    pullRequest.number,
    pullRequest.sourceRepoUrl,
  );
  const createdAt = formatDate(pullRequest.createdAt);

  const accessories: List.Item.Accessory[] = [
    pullRequestStateAccessory(pullRequest.state),
    {
      icon: Icon.SpeechBubble,
      text: String(pullRequest.commentsCount ?? 0),
      tooltip: "Comments",
    },
    {
      icon: Icon.CheckRosette,
      text: String(pullRequest.reviewsCount ?? 0),
      tooltip: "Reviews",
    },
    {
      icon: Icon.Document,
      text:
        pullRequest.stats?.changedFiles !== undefined
          ? String(pullRequest.stats.changedFiles)
          : undefined,
      tooltip: "Changed files",
    },
    { date: createdAt, tooltip: "Created" },
  ];

  return (
    <List.Item
      title={pullRequest.title}
      subtitle={`${repository} ${prNumber}`}
      icon={pullRequestIcon(pullRequest)}
      keywords={[
        repository,
        prNumber,
        pullRequest.authorLogin || "",
        pullRequest.state || "",
      ]}
      accessories={accessories}
      actions={
        <ActionPanel title={pullRequest.title}>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<PullRequestDetail pullRequest={pullRequest} />}
          />
          {url ? (
            <Action.OpenInBrowser
              title="Open Pull Request"
              icon={Icon.Globe}
              url={url}
            />
          ) : null}
          {url ? (
            <Action.CopyToClipboard
              title="Copy Pull Request URL"
              content={url}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Pull Request Title"
            content={pullRequest.title}
          />
        </ActionPanel>
      }
    />
  );
}
