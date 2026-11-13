import { Action, ActionPanel, Color, Detail, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";

import { getPullRequest, getCurrentUserUuid } from "./../../queries";
import { ApprovePullRequestAction, DeclinePullRequestAction, RequestChangesAction } from "./actions";
import { PullRequest } from "./interface";
import { ReviewState } from "./../../helpers/reviewState";
import { extractReviewers, findMyReviewState, Reviewer } from "./../../helpers/reviewers";

interface State {
  isLoading: boolean;
  markdown?: string;
  reviewers?: Reviewer[];
  error?: Error;
}

export function PullRequestDetail(props: {
  pr: PullRequest;
  onDeclined?: () => void;
  onDone?: (reviewState: ReviewState) => void;
}) {
  const { pr } = props;
  const { pop } = useNavigation();
  const [state, setState] = useState<State>({ isLoading: true });
  // `undefined` = untouched this session (defer to real data); any ReviewState
  // value, including `null`, means an action fired and must override stale data.
  const [localReviewState, setLocalReviewState] = useState<ReviewState | undefined>(undefined);
  const [myUuid, setMyUuid] = useState<string | null>(null);

  // Propagates the new state back to the row this detail view was pushed from,
  // so its reviewer accessory updates immediately instead of staying stale until
  // the list is reopened.
  function updateReviewState(next: ReviewState) {
    setLocalReviewState(next);
    props.onDone?.(next);
  }

  useEffect(() => {
    getCurrentUserUuid()
      .then(setMyUuid)
      .catch(() => setMyUuid(null));
  }, []);

  useEffect(() => {
    async function fetchPullRequest() {
      try {
        const { data } = await getPullRequest(pr.repo.slug, pr.id);
        const description = data.rendered?.description?.raw ?? data.summary?.raw ?? "_No description provided._";
        setState({
          isLoading: false,
          markdown: `# ${data.title ?? pr.title}\n\n${description}`,
          reviewers: extractReviewers(data.participants),
        });
      } catch (error) {
        setState({
          isLoading: false,
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    fetchPullRequest();
  }, []);

  if (state.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed loading pull request",
      message: state.error.message,
    });
  }

  const url = `https://bitbucket.org/${pr.repo.fullName}/pull-requests/${pr.id}`;

  const reviewers = state.reviewers ?? [];
  const reviewState = localReviewState !== undefined ? localReviewState : findMyReviewState(reviewers, myUuid);
  // Trust the merged `reviewState` over the viewer's own raw entry, which can be
  // stale immediately after an action changes it (nothing refetches right away).
  const otherReviewers = reviewers.filter((r) => !(myUuid && r.uuid === myUuid));
  const displayedReviewers: Reviewer[] = reviewState
    ? [{ nickname: "You", state: reviewState }, ...otherReviewers]
    : otherReviewers;

  return (
    <Detail
      isLoading={state.isLoading}
      markdown={state.markdown ?? `# ${pr.title}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="State" text={pr.state} />
          <Detail.Metadata.Label title="Author" text={pr.author.nickname} icon={pr.author.url} />
          <Detail.Metadata.Label title="Comments" text={`${pr.commentCount}`} />
          <Detail.Metadata.Label title="Repository" text={pr.repo.fullName} />
          {displayedReviewers.length > 0 && (
            <Detail.Metadata.TagList title="Reviewers">
              {displayedReviewers.map((reviewer) => (
                <Detail.Metadata.TagList.Item
                  key={reviewer.nickname}
                  text={reviewer.nickname}
                  color={reviewer.state === "approved" ? Color.Green : Color.Orange}
                />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Pull Request in Browser" url={url} />
            <Action.CopyToClipboard title="Copy Pull Request URL" content={url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ApprovePullRequestAction pr={pr} reviewState={reviewState} onReviewStateChange={updateReviewState} />
            <DeclinePullRequestAction
              pr={pr}
              onDeclined={() => {
                props.onDeclined?.();
                pop();
              }}
            />
            <RequestChangesAction pr={pr} reviewState={reviewState} onReviewStateChange={updateReviewState} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
