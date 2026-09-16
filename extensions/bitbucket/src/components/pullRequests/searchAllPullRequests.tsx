import { ActionPanel, List, showToast, Color, Action, Image, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import useSWR, { SWRConfig } from "swr";

import { getAllOpenPullRequests, getCurrentUserUuid, OpenPullRequestsResult } from "./../../queries";
import {
  ApprovePullRequestAction,
  DeclinePullRequestAction,
  RequestChangesAction,
  ShowPullRequestDetailAction,
} from "./actions";
import { cacheConfig } from "../../helpers/cache";
import { preferences } from "../../helpers/preferences";
import { PullRequest } from "./interface";
import { getPullRequestKey } from "./../../helpers/pullRequestKey";
import { ReviewState, setReviewState } from "./../../helpers/reviewState";
import { buildReviewAccessories, findMyReviewState } from "./../../helpers/reviewers";

const PULL_REQUESTS_CACHE_KEY = `all-open-pull-requests:${preferences.workspace}:${preferences.email}`;

export function SearchAllPullRequests() {
  return (
    <SWRConfig value={cacheConfig}>
      <SearchAllPullRequestsList />
    </SWRConfig>
  );
}

function SearchAllPullRequestsList() {
  const [progress, setProgress] = useState<OpenPullRequestsResult>();
  const { data, error, isLoading, isValidating, mutate } = useSWR(PULL_REQUESTS_CACHE_KEY, async () => {
    setProgress(undefined);
    return getAllOpenPullRequests(setProgress);
  });
  const result = data ?? progress;

  const [reviewStates, setReviewStates] = useState<Map<string, ReviewState>>(new Map());
  const [myUuid, setMyUuid] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserUuid()
      .then(setMyUuid)
      .catch(() => setMyUuid(null));
  }, []);

  const pullRequests: PullRequest[] | undefined = result?.values.map((pr) => ({
    id: pr.id,
    title: pr.title,
    state: pr.state,
    repo: {
      name: pr.destination?.repository?.name ?? "",
      fullName: pr.destination?.repository?.full_name ?? "",
      slug: pr.destination?.repository?.slug ?? "",
    },
    commentCount: pr.comment_count,
    author: {
      url: pr.author?.links?.avatar?.href ?? "",
      nickname: pr.author?.nickname,
    },
    reviewers: pr.reviewers,
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

  function removePullRequest(key: string) {
    mutate(
      (current) =>
        current && {
          ...current,
          values: current.values.filter(
            (pr) => `${pr.destination?.repository?.slug}#${pr.id}` !== key,
          ),
        },
      { revalidate: false },
    );
  }

  return (
    <List isLoading={isLoading || isValidating} searchBarPlaceholder="Search by name...">
      <List.Section title="Open Pull Requests" subtitle={pullRequests?.length + ""}>
        {pullRequests?.map((pr) => {
          const key = getPullRequestKey(pr);
          const reviewState = reviewStates.has(key)
            ? (reviewStates.get(key) ?? null)
            : findMyReviewState(pr.reviewers, myUuid);
          const onReviewStateChange = (next: ReviewState) =>
            setReviewStates((current) => setReviewState(current, key, next));
          const reviewAccessories = buildReviewAccessories(pr.reviewers, myUuid, reviewState);

          return (
            <List.Item
              key={key}
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
                    <ShowPullRequestDetailAction pr={pr} onDeclined={() => removePullRequest(key)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <ApprovePullRequestAction
                      pr={pr}
                      reviewState={reviewState}
                      onReviewStateChange={onReviewStateChange}
                    />
                    <DeclinePullRequestAction pr={pr} onDeclined={() => removePullRequest(key)} />
                    <RequestChangesAction pr={pr} reviewState={reviewState} onReviewStateChange={onReviewStateChange} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
              accessories={[
                ...reviewAccessories,
                {
                  text: `${pr.commentCount} 💬  ·  Created by ${pr.author.nickname}`,
                  icon: { source: pr.author.url, mask: Image.Mask.Circle },
                },
              ]}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
