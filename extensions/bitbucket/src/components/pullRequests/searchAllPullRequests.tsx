import { ActionPanel, List, showToast, Color, Action, Image, Toast } from "@raycast/api";
import { useEffect } from "react";
import useSWR, { SWRConfig, useSWRConfig } from "swr";

import { getAllOpenPullRequests } from "./../../queries";
import { cacheConfig } from "../../helpers/cache";
import { PullRequest } from "./interface";

const PULL_REQUESTS_CACHE_KEY = "all-open-pull-requests";

export function SearchAllPullRequests() {
  return (
    <SWRConfig value={cacheConfig}>
      <SearchAllPullRequestsList />
    </SWRConfig>
  );
}

function SearchAllPullRequestsList() {
  const { mutate } = useSWRConfig();
  const { data, error, isLoading, isValidating } = useSWR(PULL_REQUESTS_CACHE_KEY, () =>
    getAllOpenPullRequests((partial) => mutate(PULL_REQUESTS_CACHE_KEY, partial, { revalidate: false })),
  );

  const pullRequests: PullRequest[] | undefined = data?.values.map((pr) => ({
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
  }, [isValidating]);

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
