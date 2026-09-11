import { Action, ActionPanel, Image, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { compareDesc, format } from "date-fns";

import { getGitHubClient } from "../api/githubClient";
import { PullRequestCommitFieldsFragment } from "../generated/graphql";
import { getCheckStateAccessory } from "../helpers/pull-request";

import { PullRequest } from "./PullRequestActions";

type PullRequestCommitsProps = {
  pullRequest: PullRequest;
};

export default function PullRequestCommits({ pullRequest }: PullRequestCommitsProps) {
  const { github } = getGitHubClient();

  const { data, isLoading, pagination } = useCachedPromise(
    (pullRequest) =>
      async ({ cursor }) => {
        const result = await github.pullRequestCommits({
          nodeId: pullRequest.id,
          numberOfItems: 25,
          before: cursor,
        });
        const pullRequestWithCommits = result.node as PullRequestCommitFieldsFragment;
        const commits = pullRequestWithCommits.commits.nodes?.filter((node) => node != null) ?? [];
        commits.sort((a, b) => {
          const dateA = a.commit.authoredDate;
          const dateB = b.commit.authoredDate;
          return compareDesc(new Date(dateA), new Date(dateB));
        });

        return {
          data: commits,
          hasMore: pullRequestWithCommits.commits.pageInfo.hasPreviousPage,
          cursor: pullRequestWithCommits.commits.pageInfo.startCursor ?? undefined,
        };
      },
    [pullRequest],
  );

  const commits = [...new Map((data ?? []).map((node) => [node.commit.id, node])).values()];

  return (
    <List navigationTitle={`#${pullRequest.number} Commits`} isLoading={isLoading} pagination={pagination}>
      {commits.map((node) => {
        const commit = node.commit;
        const date = new Date(commit.authoredDate);

        const accessories: List.Item.Accessory[] = [{ date, tooltip: format(date, "EEEE d MMMM yyyy 'at' HH:mm") }];

        if (commit.statusCheckRollup?.state) {
          const checkStateAccessory = getCheckStateAccessory(commit.statusCheckRollup.state);

          if (checkStateAccessory) {
            accessories.unshift(checkStateAccessory);
          }
        }

        let icon: List.Item.Props["icon"] | null;
        if (commit.author) {
          const image = { source: commit.author.avatarUrl, mask: Image.Mask.Circle };
          icon = commit.author.name ? { value: image, tooltip: commit.author.name } : image;
        }

        return (
          <List.Item
            key={commit.id}
            title={commit.message}
            subtitle={{ value: commit.abbreviatedOid, tooltip: commit.oid }}
            accessories={accessories}
            {...(icon ? { icon } : {})}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Commit in Browser" url={commit.url} />
                <Action.OpenInBrowser title="Open Commit Tree in Browser" url={commit.treeUrl} />

                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    content={commit.url}
                    title="Copy Commit URL"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  />

                  <Action.CopyToClipboard
                    content={commit.oid}
                    title="Copy Commit Hash"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />

                  <Action.CopyToClipboard
                    content={commit.treeUrl}
                    title="Copy Commit Tree URL"
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "," }}
                  />

                  <Action.CopyToClipboard
                    content={commit.message}
                    title="Copy Commit Message"
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "." }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
