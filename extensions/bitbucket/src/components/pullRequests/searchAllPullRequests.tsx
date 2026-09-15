import { ActionPanel, List, showToast, Color, Action, Icon, Image, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

import { getAllOpenPullRequests } from "./../../queries";
import {
  ApprovePullRequestAction,
  DeclinePullRequestAction,
  RequestChangesAction,
  ShowPullRequestDetailAction,
} from "./actions";
import { PullRequest } from "./interface";
import { getPullRequestKey } from "./../../helpers/pullRequestKey";
import { ReviewState, setReviewState } from "./../../helpers/reviewState";

interface State {
  pullRequests?: PullRequest[];
  error?: Error;
}

export function SearchAllPullRequests() {
  const [state, setState] = useState<State>({});
  const [reviewStates, setReviewStates] = useState<Map<string, ReviewState>>(new Map());

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
          const reviewState = reviewStates.get(key) ?? null;
          const onReviewStateChange = (next: ReviewState) =>
            setReviewStates((current) => setReviewState(current, key, next));
          const reviewAccessory =
            reviewState === "changes_requested"
              ? { icon: { source: Icon.ExclamationMark, tintColor: Color.Orange }, tooltip: "You requested changes" }
              : reviewState === "approved"
                ? { icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "You approved" }
                : undefined;

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
                ...(reviewAccessory ? [reviewAccessory] : []),
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
