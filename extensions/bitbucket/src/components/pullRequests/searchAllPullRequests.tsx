import { ActionPanel, List, showToast, Color, Action, Image, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

import { getAllOpenPullRequests, getCurrentUserUuid } from "./../../queries";
import {
  ApprovePullRequestAction,
  DeclinePullRequestAction,
  RequestChangesAction,
  ShowPullRequestDetailAction,
} from "./actions";
import { PullRequest } from "./interface";
import { getPullRequestKey } from "./../../helpers/pullRequestKey";
import { ReviewState, setReviewState } from "./../../helpers/reviewState";
import { buildReviewAccessories, findMyReviewState } from "./../../helpers/reviewers";

interface State {
  pullRequests?: PullRequest[];
  error?: Error;
}

export function SearchAllPullRequests() {
  const [state, setState] = useState<State>({});
  const [reviewStates, setReviewStates] = useState<Map<string, ReviewState>>(new Map());
  const [myUuid, setMyUuid] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserUuid()
      .then(setMyUuid)
      .catch(() => setMyUuid(null));
  }, []);

  useEffect(() => {
    async function fetchPRs() {
      try {
        const { values: pullRequests, failedRepoCount } = await getAllOpenPullRequests();

        const prs =
          pullRequests.map((pr) => ({
            id: pr.id,
            title: pr.title,
            state: pr.state,
            repo: {
              name: pr.destination?.repository?.name,
              fullName: pr.destination?.repository?.full_name,
              slug: pr.destination?.repository?.slug,
            },
            commentCount: pr.comment_count,
            author: {
              url: pr.author?.links?.avatar?.href,
              nickname: pr.author?.nickname,
            },
            reviewers: pr.reviewers,
          })) ?? [];
        setState({ pullRequests: prs });

        if (failedRepoCount > 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Some repositories failed to load",
            message: `Could not fetch pull requests from ${failedRepoCount} ${
              failedRepoCount === 1 ? "repository" : "repositories"
            }. Results may be incomplete.`,
          });
        }
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    fetchPRs();
  }, []);

  if (state.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed loading pull requests",
      message: state.error.message,
    });
  }

  function removePullRequest(id: number) {
    setState((current) => ({
      ...current,
      pullRequests: current.pullRequests?.filter((pr) => pr.id !== id),
    }));
  }

  return (
    <List isLoading={!state.pullRequests && !state.error} searchBarPlaceholder="Search by name...">
      <List.Section title="Open Pull Requests" subtitle={state.pullRequests?.length + ""}>
        {state.pullRequests?.map((pr) => {
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
                    <ShowPullRequestDetailAction pr={pr} onDeclined={() => removePullRequest(pr.id)} />
                    <Action.OpenInBrowser
                      title="Open Pull Request in Browser"
                      url={`https://bitbucket.org/${pr.repo.fullName}/pull-requests/${pr.id}`}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <ApprovePullRequestAction
                      pr={pr}
                      reviewState={reviewState}
                      onReviewStateChange={onReviewStateChange}
                    />
                    <DeclinePullRequestAction pr={pr} onDeclined={() => removePullRequest(pr.id)} />
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
