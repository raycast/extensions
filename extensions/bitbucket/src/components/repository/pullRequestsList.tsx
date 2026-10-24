import { ActionPanel, List, showToast, Color, Action, Image, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

import { Repository } from "./interface";
import {
  ApprovePullRequestAction,
  DeclinePullRequestAction,
  RequestChangesAction,
  ShowPullRequestDetailAction,
} from "../pullRequests/actions";
import { PullRequest } from "../pullRequests/interface";

import { pullRequestsGetQuery, getCurrentUserUuid } from "./../../queries";
import { getPullRequestKey } from "./../../helpers/pullRequestKey";
import { ReviewState, setReviewState } from "./../../helpers/reviewState";
import { buildReviewAccessories, extractReviewers, findMyReviewState } from "./../../helpers/reviewers";

interface State {
  pullRequests?: PullRequest[];
  error?: Error;
}

export function PullRequestsList(props: { repo: Repository; pageNumber: number }) {
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
        const { data } = await pullRequestsGetQuery(props.repo.slug);

        const prs =
          data.values?.map((pr) => ({
            id: pr.id as number,
            title: pr.title as string,
            state: (pr.state as PullRequest["state"]) ?? "OPEN",
            repo: {
              name: pr.destination?.repository?.name as string,
              fullName: pr?.destination?.repository?.full_name as string,
              slug: (pr.destination?.repository?.slug as string) ?? props.repo.slug,
            },
            commentCount: pr.comment_count as number,
            author: {
              url: pr.author?.links?.avatar?.href as string,
              nickname: pr.author?.nickname as string,
            },
            reviewers: extractReviewers(pr.participants),
          })) ?? [];
        setState({ pullRequests: prs });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    fetchPRs();
  }, []);

  if (state.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed loading repositories",
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
                    <Action.OpenInBrowser
                      title="Open Pull Request in Browser"
                      url={`https://bitbucket.org/${pr.repo.fullName}/pull-requests/${pr.id}`}
                    />
                    <ShowPullRequestDetailAction
                      pr={pr}
                      onDeclined={() => removePullRequest(pr.id)}
                      onDone={onReviewStateChange}
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
