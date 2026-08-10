import { getGithubActorName, GithubPullRequest, GithubPullRequestState, GithubReviewer } from "../types";
import { PreviewDetail } from "../../../preview/PreviewDetail";
import { cleanHtml, formatElapsedTime } from "../../../utils";
import { checkRunEmoji, reviewStateEmoji } from "../markdown";
import { Notification } from "../../../notification";
import { Color, Detail } from "@raycast/api";

interface GithubPullRequestPreviewProps {
  notification: Notification;
  githubPullRequest: GithubPullRequest;
}

function stateTag(pr: GithubPullRequest): { text: string; color: Color } {
  if (pr.state === GithubPullRequestState.Merged) return { text: "Merged", color: Color.Purple };
  if (pr.state === GithubPullRequestState.Closed) return { text: "Closed", color: Color.Red };
  if (pr.is_draft) return { text: "Draft", color: Color.SecondaryText };
  return { text: "Open", color: Color.Green };
}

function reviewerName(reviewer: GithubReviewer): string {
  switch (reviewer.type) {
    case "GithubUserSummary":
      return reviewer.content.name || reviewer.content.login;
    case "GithubBotSummary":
    case "GithubMannequinSummary":
      return reviewer.content.login;
    case "GithubTeamSummary":
      return reviewer.content.name;
  }
}

export function GithubPullRequestPreview({ notification, githubPullRequest: pr }: GithubPullRequestPreviewProps) {
  let markdown = `# ${pr.title} #${pr.number}`;
  if (pr.body) {
    markdown += `\n\n${cleanHtml(pr.body)}`;
  }

  const checkRuns = pr.latest_commit.check_suites?.flatMap((suite) => suite.check_runs) ?? [];
  if (checkRuns.length > 0) {
    markdown += `\n\n---\n\n## Checks\n\n`;
    markdown += checkRuns.map((run) => `${checkRunEmoji(run.conclusion, run.status)} ${run.name}`).join("\n");
  }

  if (pr.reviews.length > 0) {
    markdown += `\n\n---\n\n## Reviews\n\n`;
    markdown += pr.reviews
      .map((review) => {
        const head = `${reviewStateEmoji(review.state)} **${getGithubActorName(review.author)}**`;
        return review.body ? `${head}\n\n${cleanHtml(review.body)}` : head;
      })
      .join("\n\n");
  }

  if (pr.comments.length > 0) {
    markdown += `\n\n---\n\n## Comments\n\n`;
    markdown += pr.comments
      .map(
        (comment) =>
          `**${getGithubActorName(comment.author)}** · ${formatElapsedTime(comment.created_at)}\n\n${cleanHtml(comment.body)}`,
      )
      .join("\n\n---\n\n");
  }

  const state = stateTag(pr);

  const metadata = (
    <>
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item text={state.text} color={state.color} />
      </Detail.Metadata.TagList>
      {pr.state === GithubPullRequestState.Open ? (
        <Detail.Metadata.Label title="Mergeable" text={`${pr.mergeable_state} · ${pr.merge_state_status}`} />
      ) : null}
      <Detail.Metadata.Label title="Changes" text={`+${pr.additions} −${pr.deletions} in ${pr.changed_files} files`} />
      <Detail.Metadata.Label title="Branch" text={`${pr.head_ref_name} → ${pr.base_ref_name}`} />
      {pr.review_decision ? <Detail.Metadata.Label title="Review" text={pr.review_decision} /> : null}
      {pr.author ? <Detail.Metadata.Label title="Author" text={getGithubActorName(pr.author)} /> : null}
      {pr.assignees.length > 0 ? (
        <Detail.Metadata.TagList title="Assignees">
          {pr.assignees.map((assignee, index) => (
            <Detail.Metadata.TagList.Item key={index} text={getGithubActorName(assignee)} />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
      {pr.review_requests.length > 0 ? (
        <Detail.Metadata.TagList title="Review requests">
          {pr.review_requests.map((reviewer, index) => (
            <Detail.Metadata.TagList.Item key={index} text={reviewerName(reviewer)} />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
      {pr.labels.length > 0 ? (
        <Detail.Metadata.TagList title="Labels">
          {pr.labels.map((label) => (
            <Detail.Metadata.TagList.Item key={label.name} text={label.name} color={`#${label.color}`} />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
    </>
  );

  return <PreviewDetail notification={notification} markdown={markdown} metadata={metadata} />;
}
