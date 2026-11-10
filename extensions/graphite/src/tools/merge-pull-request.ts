import { Action, Cache, getPreferenceValues, open } from "@raycast/api";
import type { Tool } from "@raycast/api";
import {
  CONFETTI_URL,
  gitHubPullRequestUrl,
  graphiteAppUrl,
  graphitePullRequestUrl,
  mergeWithGraphite,
} from "../lib/api";
import { isReadyToMerge } from "../lib/indicators";
import { mergeabilityOf, planMerge } from "../lib/merge-plan";
import { formatPullRequest, requirePullRequest } from "../lib/pull-request-input";
import { humanize } from "../lib/presentation";
import { refKey } from "../lib/refs";

type Input = {
  /**
   * The pull request to merge, as `owner/repo#number` (the `pullRequest` field from get-inbox), a GitHub pull request
   * URL, or a Graphite pull request URL. Graphite also merges every pull request below it in the stack.
   */
  pullRequest: string;
};

// Raycast runs the confirmation and the tool separately. When the confirmation is skipped because the pull request
// isn't ready, this marker makes sure the tool refuses too, even if the pull request became ready in between, so a
// merge never happens without the user confirming it.
const cache = new Cache({ namespace: "merge-tool" });
const SKIPPED_TTL_MS = 5 * 60_000;
const skippedKey = (input: Input) => `skipped:${refKey(requirePullRequest(input.pullRequest))}`;

function notReady(ref: string, mergeability: string | undefined) {
  return {
    merged: false,
    pullRequest: ref,
    reason: mergeability
      ? `Graphite says this pull request isn't ready to merge: ${humanize(mergeability)}.`
      : "Graphite didn't report a merge status for this pull request, so it wasn't merged.",
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const ref = requirePullRequest(input.pullRequest);
  const mergeability = await mergeabilityOf(ref);
  if (!isReadyToMerge(mergeability)) {
    // Nothing will merge, so there's nothing to confirm. The tool reads this marker and refuses.
    cache.set(skippedKey(input), String(Date.now()));
    return undefined;
  }
  cache.remove(skippedKey(input));
  const { trunk, pullRequests } = await planMerge(ref);
  return {
    style: Action.Style.Destructive,
    message:
      pullRequests.length > 1
        ? `Merge ${pullRequests.length} pull requests into ${trunk} with Graphite?`
        : `Merge ${formatPullRequest(ref)} into ${trunk} with Graphite?`,
    info: [
      ...pullRequests.map((pr, index) => ({
        name: pullRequests.length > 1 ? `${index + 1}. #${pr.number}` : `#${pr.number}`,
        value: pr.title,
      })),
      { name: "Into", value: trunk },
      { name: "How", value: "Bottom of the stack first, through the merge queue if the repository uses one" },
    ],
  };
};

/**
 * Merges a pull request and the pull requests below it in its stack with Graphite, like the Merge button in Graphite
 * and `gt merge`. Only merges when Graphite reports the pull request as ready to merge, and the user confirms first.
 * Never call it unless the user explicitly asks to merge.
 */
export default async function tool(input: Input) {
  const ref = requirePullRequest(input.pullRequest);
  const name = formatPullRequest(ref);
  const skipped = cache.get(skippedKey(input));
  if (skipped !== undefined) {
    cache.remove(skippedKey(input));
    if (Date.now() - Number(skipped) < SKIPPED_TTL_MS) return notReady(name, await mergeabilityOf(ref));
  }

  const mergeability = await mergeabilityOf(ref);
  if (!isReadyToMerge(mergeability)) return notReady(name, mergeability);

  const { trunk, pullRequests } = await planMerge(ref);
  await mergeWithGraphite(
    ref.owner,
    ref.repo,
    trunk,
    pullRequests.map((pr) => pr.number),
  );
  if (getPreferenceValues<Preferences>().celebrateMerges) await open(CONFETTI_URL).catch(() => undefined);
  const appUrl = await graphiteAppUrl().catch(() => undefined);
  return {
    merged: true,
    status: "Graphite started merging in the background. It can take a few minutes, longer with a merge queue.",
    into: trunk,
    pullRequests: pullRequests.map((pr) => ({
      number: pr.number,
      title: pr.title,
      url: appUrl
        ? graphitePullRequestUrl(appUrl, ref.owner, ref.repo, pr.number)
        : gitHubPullRequestUrl(ref.owner, ref.repo, pr.number),
    })),
  };
}
