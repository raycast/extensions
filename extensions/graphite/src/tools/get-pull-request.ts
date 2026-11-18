import { graphiteAppUrl } from "../lib/api";
import { detailsForAI } from "../lib/ai-format";
import { fetchDetails } from "../lib/github";
import { mergeabilityOf } from "../lib/merge-plan";
import { requirePullRequest } from "../lib/pull-request-input";

type Input = {
  /**
   * The pull request, as `owner/repo#number` (the `pullRequest` field from get-inbox), a GitHub pull request URL,
   * or a Graphite pull request URL. If the user names a pull request by title, call get-inbox first to find it.
   */
  pullRequest: string;
};

/**
 * Gets one pull request in full: description, reviews and their comments, unresolved review comments with file and
 * line, requested reviewers, CI checks (with the names of failing ones), size, branches, and Graphite's merge status.
 * Use it to summarize feedback, explain why a pull request is blocked, or draft a review.
 */
export default async function tool(input: Input) {
  const ref = requirePullRequest(input.pullRequest);
  const [details, mergeability, appUrl] = await Promise.all([
    fetchDetails(ref),
    mergeabilityOf(ref).catch(() => undefined),
    graphiteAppUrl().catch(() => undefined),
  ]);
  return detailsForAI(details, ref, appUrl, mergeability);
}
