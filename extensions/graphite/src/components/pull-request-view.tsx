import { Color, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchMergeability, PullRequest } from "../lib/api";
import { Check, fetchDetails, GitHubUnavailableError, PullRequestDetails, PullRequestRef, Review } from "../lib/github";
import {
  checksIndicator,
  conversationsIndicator,
  mergeIndicator,
  reviewIndicator,
  viewerReviewIndicator,
} from "../lib/indicators";
import { authorIcon, pluralize, pullRequestLinks, pullRequestStatusTag, relativeTime } from "../lib/presentation";
import { OpenPullRequestActions, PullRequestActionPanel } from "./pull-request-actions";

const MAX_QUOTE_LENGTH = 400;

/** Review comments, especially from bots, are full of HTML that Raycast would print as text. Keep the words. */
function plainText(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function quote(text: string): string {
  const trimmed = plainText(text);
  const short = trimmed.length > MAX_QUOTE_LENGTH ? `${trimmed.slice(0, MAX_QUOTE_LENGTH)}…` : trimmed;
  return short
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

/** GitHub descriptions often carry HTML comments from PR templates; Raycast would print them verbatim. */
function cleanBody(body: string): string {
  return body.replace(/<!--[\s\S]*?-->/g, "").trim();
}

function feedbackMarkdown(details: PullRequestDetails): string {
  const parts: string[] = [];
  if (details.unresolved.length > 0) {
    parts.push(`## Unresolved comments (${details.unresolved.length})`);
    for (const thread of details.unresolved) {
      const location = `${thread.path}${thread.line ? `:${thread.line}` : ""}`;
      const meta = [
        `**@${thread.author}**`,
        `\`${location}\``,
        thread.replies ? pluralize(thread.replies, "reply", "replies") : "",
        thread.isOutdated ? "_outdated_" : "",
      ].filter(Boolean);
      parts.push(`${meta.join(" · ")}\n\n${quote(thread.body)}`);
    }
  }
  const approvalNotes = details.approvalsWithComments.filter((review) => review.body.trim());
  if (approvalNotes.length > 0) {
    parts.push("## Approved with comments");
    for (const review of approvalNotes)
      parts.push(`**@${review.author?.login ?? "someone"}**\n\n${quote(review.body)}`);
  }
  const changeRequests = details.reviews.filter((review) => review.state === "CHANGES_REQUESTED" && review.body.trim());
  if (changeRequests.length > 0) {
    parts.push("## Changes requested");
    for (const review of changeRequests)
      parts.push(`**@${review.author?.login ?? "someone"}**\n\n${quote(review.body)}`);
  }
  if (details.commentReviews.length > 0) {
    parts.push("## Review comments");
    for (const review of details.commentReviews)
      parts.push(`**@${review.author?.login ?? "someone"}**\n\n${quote(review.body)}`);
  }
  return parts.join("\n\n");
}

const REVIEW_COLORS: Record<string, Color> = {
  APPROVED: Color.Green,
  CHANGES_REQUESTED: Color.Red,
  COMMENTED: Color.SecondaryText,
  DISMISSED: Color.SecondaryText,
};

function checkSummary(checks: Check[]): string {
  const count = (state: Check["state"]) => checks.filter((check) => check.state === state).length;
  return [
    count("FAILURE") ? `${count("FAILURE")} failing` : "",
    count("PENDING") ? `${count("PENDING")} running` : "",
    count("SUCCESS") ? `${count("SUCCESS")} passed` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

/** Full pull request page: description and feedback on the left, the facts on the right, like Graphite. */
export function PullRequestView(props: {
  pullRequest: PullRequest;
  appUrl: string;
  sectionNames: string[];
  onChanged: () => void;
}) {
  const { pullRequest: pr, appUrl, sectionNames, onChanged } = props;
  const ref: PullRequestRef = { owner: pr.repo.owner, repo: pr.repo.name, number: pr.number };
  const links = pullRequestLinks(appUrl, ref.owner, ref.repo, ref.number);

  const {
    data: details,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    (owner: string, repo: string, number: number) => fetchDetails({ owner, repo, number }),
    [ref.owner, ref.repo, ref.number],
    // Failures are explained inside the page; skip the generic failure toast.
    { onError: () => undefined },
  );
  const { data: mergeability, revalidate: revalidateMergeability } = useCachedPromise(
    async (owner: string, repo: string, number: number) => (await fetchMergeability(owner, repo, [number]))[number],
    [ref.owner, ref.repo, ref.number],
    { onError: () => undefined },
  );
  const refresh = () => {
    revalidate();
    revalidateMergeability();
    onChanged();
  };

  const githubMissing = error instanceof GitHubUnavailableError;
  const body = details ? cleanBody(details.body) : "";
  const markdown = [
    `# ${pr.title}`,
    details ? body || "_No description._" : "",
    details ? feedbackMarkdown(details) : "",
    error
      ? githubMissing
        ? error.reason === "NOT_INSTALLED"
          ? "> Install the GitHub CLI (cli.github.com) and run `gh auth login` to see the description, reviews, and comments."
          : error.reason === "NOT_AUTHENTICATED"
            ? "> Sign in to the GitHub CLI with `gh auth login` to see the description, reviews, and comments."
            : `> Couldn't load details from GitHub: ${error.message}`
        : `> Couldn't load details from GitHub: ${error.message}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const status = pullRequestStatusTag(details?.state ?? pr.state, details?.isDraft);
  const review = reviewIndicator(details?.reviewDecision ?? pr.reviewDecision);
  const mine = details ? viewerReviewIndicator(details) : undefined;
  const conversations = details ? conversationsIndicator(details) : undefined;
  const checks = details ? checksIndicator(details.checks) : undefined;
  const merge = mergeIndicator(mergeability);
  const reviewers = details ? reviewerTags(details.reviews, details.requestedReviewers) : [];

  return (
    <Detail
      navigationTitle={`${pr.repo.name} #${pr.number}`}
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={status.value} color={status.color} />
            {merge ? <Detail.Metadata.TagList.Item text={merge.label} color={merge.color} /> : null}
          </Detail.Metadata.TagList>
          {review ? (
            <Detail.Metadata.TagList title="Review">
              <Detail.Metadata.TagList.Item text={review.label} color={review.color} />
              {mine ? <Detail.Metadata.TagList.Item text={mine.label} color={mine.color} /> : null}
            </Detail.Metadata.TagList>
          ) : null}
          {reviewers.length > 0 ? (
            <Detail.Metadata.TagList title="Reviewers">
              {reviewers.map((reviewer) => (
                <Detail.Metadata.TagList.Item key={reviewer.login} text={reviewer.login} color={reviewer.color} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {details ? (
            <Detail.Metadata.Label
              title="Comments"
              text={
                conversations?.label ??
                (details.unresolved.length === 0 && !details.threadsTruncated ? "All resolved" : "")
              }
              icon={
                conversations
                  ? { source: conversations.icon, tintColor: conversations.color }
                  : { source: Icon.CheckCircle, tintColor: Color.Green }
              }
            />
          ) : null}
          {details && details.checkRuns.length > 0 ? (
            <Detail.Metadata.Label
              title="Checks"
              text={checkSummary(details.checkRuns)}
              icon={checks ? { source: checks.icon, tintColor: checks.color } : undefined}
            />
          ) : null}
          <Detail.Metadata.Separator />
          {pr.author ? (
            <Detail.Metadata.Label
              title="Author"
              text={pr.author.name ? `${pr.author.name} (${pr.author.login})` : pr.author.login}
              icon={authorIcon(pr)}
            />
          ) : null}
          <Detail.Metadata.Label title="Repository" text={`${pr.repo.owner}/${pr.repo.name}`} />
          {details ? (
            <Detail.Metadata.Label title="Branch" text={`${details.headRefName} → ${details.baseRefName}`} />
          ) : null}
          {details ? (
            <Detail.Metadata.Label
              title="Changes"
              text={`+${details.additions} −${details.deletions} in ${pluralize(details.changedFiles, "file")}`}
            />
          ) : null}
          {details && details.labels.length > 0 ? (
            <Detail.Metadata.TagList title="Labels">
              {details.labels.map((label) => (
                <Detail.Metadata.TagList.Item key={label.name} text={label.name} color={`#${label.color}`} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Label title="Opened" text={relativeTime(pr.createdAt)} />
          <Detail.Metadata.Label title="Updated" text={relativeTime(pr.updatedAt)} />
          {sectionNames.length > 0 ? (
            <Detail.Metadata.TagList title="In Your Inbox">
              {sectionNames.map((name) => (
                <Detail.Metadata.TagList.Item key={name} text={name} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Graphite" target={links.graphite} text="Open in Graphite" />
          <Detail.Metadata.Link title="GitHub" target={links.github} text="Open on GitHub" />
        </Detail.Metadata>
      }
      actions={
        <PullRequestActionPanel
          pullRequest={ref}
          title={pr.title}
          links={links}
          githubAvailable={!(error instanceof GitHubUnavailableError)}
          status={details}
          mergeability={mergeability}
          onChanged={refresh}
          openActions={<OpenPullRequestActions links={links} />}
        />
      }
    />
  );
}

function reviewerTags(reviews: Review[], requested: string[]): { login: string; color: Color }[] {
  const tags = reviews
    .filter((review) => review.author)
    .map((review) => ({
      login: review.author?.login ?? "",
      color: REVIEW_COLORS[review.state] ?? Color.SecondaryText,
    }));
  const reviewed = new Set(tags.map((tag) => tag.login));
  const pending = requested.filter((login) => !reviewed.has(login)).map((login) => ({ login, color: Color.Yellow }));
  return [...tags, ...pending];
}
