import { Action, Cache, getPreferenceValues } from "@raycast/api";
import type { Tool } from "@raycast/api";
import { z } from "zod";
import { gitHubPullRequestUrl, graphiteAppUrl, graphitePullRequestUrl, mergeWithGraphite } from "../lib/api";
import { celebrate } from "../lib/celebrate";
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

// Raycast runs the confirmation and the tool separately, so the confirmation leaves a note for the tool:
// - "skipped": the pull request wasn't ready, nothing was shown, so the tool refuses even if it became ready since.
// - "confirmed": the stack and target branch the user saw, so the tool refuses if they changed in between.
const cache = new Cache({ namespace: "merge-tool" });
const NOTE_TTL_MS = 5 * 60_000;
const noteKey = (input: Input) => `note:${refKey(requirePullRequest(input.pullRequest))}`;
const noteSchema = z.object({
  at: z.number(),
  skipped: z.boolean(),
  trunk: z.string().optional(),
  numbers: z.array(z.number()).optional(),
});

function takeNote(input: Input): z.infer<typeof noteSchema> | undefined {
  const raw = cache.get(noteKey(input));
  cache.remove(noteKey(input));
  if (raw === undefined) return undefined;
  try {
    const note = noteSchema.parse(JSON.parse(raw));
    return Date.now() - note.at < NOTE_TTL_MS ? note : undefined;
  } catch {
    return undefined;
  }
}

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
    // Nothing will merge, so there's nothing to confirm. The tool reads this note and refuses.
    cache.set(noteKey(input), JSON.stringify({ at: Date.now(), skipped: true }));
    return undefined;
  }
  const { trunk, pullRequests } = await planMerge(ref);
  cache.set(
    noteKey(input),
    JSON.stringify({ at: Date.now(), skipped: false, trunk, numbers: pullRequests.map((pr) => pr.number) }),
  );
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
  const note = takeNote(input);
  if (note?.skipped) return notReady(name, await mergeabilityOf(ref));

  const mergeability = await mergeabilityOf(ref);
  if (!isReadyToMerge(mergeability)) return notReady(name, mergeability);

  const { trunk, pullRequests } = await planMerge(ref);
  const numbers = pullRequests.map((pr) => pr.number);
  if (note && (note.trunk !== trunk || note.numbers?.join() !== numbers.join())) {
    return {
      merged: false,
      pullRequest: name,
      reason:
        "The stack or its target branch changed after you confirmed, so nothing was merged. Ask again to review the new stack.",
    };
  }
  await mergeWithGraphite(ref.owner, ref.repo, trunk, numbers);
  if (getPreferenceValues<Preferences>().celebrateMerges) await celebrate();
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
