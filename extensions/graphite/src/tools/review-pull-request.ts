import { Action } from "@raycast/api";
import { gitHubPullRequestUrl, graphiteAppUrl, graphitePullRequestUrl } from "../lib/api";
import type { Tool } from "@raycast/api";
import { fetchDetails, ReviewKind, submitReview } from "../lib/github";
import { formatPullRequest, requirePullRequest } from "../lib/pull-request-input";

type Input = {
  /**
   * The pull request, as `owner/repo#number` (the `pullRequest` field from get-inbox), a GitHub pull request URL,
   * or a Graphite pull request URL.
   */
  pullRequest: string;
  /** "approve", "request-changes", or "comment". Use exactly what the user asked for; never upgrade a comment to an approval. */
  action: ReviewKind;
  /**
   * The review comment in GitHub Markdown. Required for "request-changes" and "comment", optional for "approve".
   * When you wrote it for the user, show it to them first.
   */
  body?: string;
};

const ACTION_TITLES: Record<ReviewKind, string> = {
  approve: "Approve",
  "request-changes": "Request Changes",
  comment: "Comment",
};

function validate(input: Input) {
  if (!(input.action in ACTION_TITLES)) {
    throw new Error(`Unknown review action "${input.action}". Use "approve", "request-changes", or "comment".`);
  }
  if (input.action !== "approve" && !input.body?.trim()) {
    throw new Error(`A "${input.action}" review needs a body. Ask the user what to write.`);
  }
  return requirePullRequest(input.pullRequest);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const ref = validate(input);
  const title = await fetchDetails(ref)
    .then((details) => details.title)
    .catch(() => undefined);
  return {
    style: input.action === "request-changes" ? Action.Style.Destructive : Action.Style.Regular,
    message: `${ACTION_TITLES[input.action]} ${formatPullRequest(ref)} on GitHub?`,
    info: [
      { name: "Pull Request", value: title ? `${title} (${formatPullRequest(ref)})` : formatPullRequest(ref) },
      { name: "Review", value: ACTION_TITLES[input.action] },
      { name: "Comment", value: input.body?.trim() || undefined },
    ],
  };
};

/**
 * Submits a GitHub review on a pull request with the GitHub CLI: approve, request changes, or comment. The user
 * confirms before anything is posted. Only use it when the user explicitly asks to review, approve, or comment.
 */
export default async function tool(input: Input) {
  const ref = validate(input);
  await submitReview(ref, input.action, input.body);
  const appUrl = await graphiteAppUrl().catch(() => undefined);
  return {
    submitted: true,
    pullRequest: formatPullRequest(ref),
    review: ACTION_TITLES[input.action],
    graphiteUrl: appUrl ? graphitePullRequestUrl(appUrl, ref.owner, ref.repo, ref.number) : undefined,
    githubUrl: gitHubPullRequestUrl(ref.owner, ref.repo, ref.number),
  };
}
