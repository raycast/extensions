import { ActionPanel, List, showToast, Color, Action, Image, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import useSWR, { SWRConfig } from "swr";

import { getMyOpenPullRequests, OpenPullRequestsResult } from "./../../queries";
import { cacheConfig } from "../../helpers/cache";
import { preferences } from "../../helpers/preferences";
import { PullRequest } from "./interface";

const MY_PULL_REQUESTS_CACHE_KEY = `my-open-pull-requests:${preferences.workspace}:${preferences.email}`;

export function SearchMyPullRequests() {
  return (
    <SWRConfig value={cacheConfig}>
      <SearchMyPullRequestsList />
    </SWRConfig>
  );
}

function SearchMyPullRequestsList() {
  const [progress, setProgress] = useState<OpenPullRequestsResult>();
  const { data, error, isLoading, isValidating } = useSWR(MY_PULL_REQUESTS_CACHE_KEY, async () => {
    setProgress(undefined);
    return getMyOpenPullRequests(setProgress);
  });
  const result = data ?? progress;

  const pullRequests: PullRequest[] | undefined = result?.values.map((pr) => ({
    id: pr.id,
    title: pr.title,
    repo: {
      name: pr.destination?.repository?.name ?? "",
      fullName: pr.destination?.repository?.full_name ?? "",
    },
    commentCount: pr.comment_count,
    author: {
      url: pr.author?.links?.avatar?.href ?? "",
      nickname: pr.author?.nickname,
    },
  }));

  useEffect(() => {
    if (!isValidating && data && data.failedRepoCount > 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Some repositories failed to load",
        message: `Could not fetch pull requests from ${data.failedRepoCount} ${
          data.failedRepoCount === 1 ? "repository" : "repositories"
        }. Results may be incomplete.`,
      });
    }
  }, [isValidating, data]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading pull requests",
        message: error instanceof Error ? error.message : "Something went wrong",
      });
    }
  }, [error]);

  return (
    <List isLoading={isLoading || isValidating} searchBarPlaceholder="Search by name...">
      <List.Section title="Open Pull Requests" subtitle={pullRequests?.length + ""}>
        {pullRequests?.map((pr) => (
          <List.Item
            key={`${pr.repo.fullName}-${pr.id}`}
            title={pr.title}
            subtitle={pr.repo?.fullName}
            icon={{ source: "icon-pr.png", tintColor: Color.PrimaryText }}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open Pull Request in Browser"
                    url={`https://bitbucket.org/${pr.repo.fullName}/pull-requests/${pr.id}`}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            accessories={[
              {
                text: `${pr.commentCount} 💬  ·  Created by ${pr.author.nickname}`,
                icon: { source: pr.author.url, mask: Image.Mask.Circle },
              },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
