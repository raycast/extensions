import { Action, ActionPanel, Detail, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { getPullRequest } from "./../../queries";
import { ApprovePullRequestAction, DeclinePullRequestAction, RequestChangesAction } from "./actions";
import { PullRequest } from "./interface";
import { ReviewState } from "./../../helpers/reviewState";

interface State {
  isLoading: boolean;
  markdown?: string;
  error?: Error;
}

export function PullRequestDetail(props: { pr: PullRequest; onDeclined?: () => void; onDone?: () => void }) {
  const { pr } = props;
  const [state, setState] = useState<State>({ isLoading: true });
  const [reviewState, setReviewState] = useState<ReviewState>(null);

  useEffect(() => {
    async function fetchPullRequest() {
      try {
        const { data } = await getPullRequest(pr.repo.slug, pr.id);
        const description = data.rendered?.description?.raw ?? data.summary?.raw ?? "_No description provided._";
        setState({ isLoading: false, markdown: `# ${data.title ?? pr.title}\n\n${description}` });
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
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Pull Request in Browser" url={url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ApprovePullRequestAction pr={pr} reviewState={reviewState} onReviewStateChange={setReviewState} />
            <DeclinePullRequestAction pr={pr} onDeclined={props.onDeclined} />
            <RequestChangesAction pr={pr} reviewState={reviewState} onReviewStateChange={setReviewState} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
