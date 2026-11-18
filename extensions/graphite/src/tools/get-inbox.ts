import { fetchInbox, fetchMergeability } from "../lib/api";
import { inboxForAI } from "../lib/ai-format";
import { fetchStatuses, PullRequestRef, refKey } from "../lib/github";
import { readSectionSettings, visibleSections } from "../lib/section-settings";

type Input = {
  /**
   * Only set this when the user names one of their inbox sections, for example "review" for "Needs your review".
   * Case-insensitive, matches part of the name. Leave it empty for general questions (what's blocked, what's new,
   * what needs me), because sections are user-defined and the answer may span several of them.
   */
  section?: string;
  /** Set to true to include sections the user hid in Raycast's Configure Sections. Defaults to false. */
  includeHiddenSections?: boolean;
};

/**
 * Lists the pull requests in the user's Graphite PR inbox, grouped by inbox section (for example "Needs your review",
 * "Returned to you", "Approved", "Merging and recently merged"). Each pull request includes its review decision,
 * the user's own review, unresolved comment count, CI checks, and Graphite's merge status. Use this to answer
 * questions about what needs the user's attention, and to find the `pullRequest` reference (owner/repo#number) that
 * other Graphite tools take.
 */
export default async function tool(input: Input) {
  const inbox = await fetchInbox();
  const settings = readSectionSettings();
  const query = input.section?.trim().toLowerCase();
  const sections = (input.includeHiddenSections ? inbox.sections : visibleSections(inbox.sections, settings)).filter(
    (section) => !query || section.name.toLowerCase().includes(query),
  );

  const refs: PullRequestRef[] = sections.flatMap((section) =>
    section.prs.map((pr) => ({ owner: pr.repo.owner, repo: pr.repo.name, number: pr.number })),
  );
  const byRepo = new Map<string, PullRequestRef[]>();
  for (const ref of refs) {
    const key = `${ref.owner}/${ref.repo}`.toLowerCase();
    byRepo.set(key, [...(byRepo.get(key) ?? []), ref]);
  }

  const [statuses, ...mergeabilityByRepo] = await Promise.allSettled([
    refs.length > 0 ? fetchStatuses(refs) : Promise.resolve({}),
    ...[...byRepo.values()].map(async (repoRefs) => {
      const { owner, repo } = repoRefs[0];
      const result = await fetchMergeability(owner, repo, [...new Set(repoRefs.map((ref) => ref.number))]);
      return repoRefs.flatMap((ref): [string, string][] => {
        const status = result[ref.number];
        return status ? [[refKey(ref), status]] : [];
      });
    }),
  ]);

  const mergeability: Record<string, string> = {};
  for (const result of mergeabilityByRepo) {
    if (result.status === "fulfilled") Object.assign(mergeability, Object.fromEntries(result.value));
  }

  const hiddenCount = input.includeHiddenSections
    ? 0
    : inbox.sections.length - visibleSections(inbox.sections, settings).length;
  return {
    graphiteInboxUrl: inbox.appUrl,
    sections: inboxForAI(sections, inbox.appUrl, statuses.status === "fulfilled" ? statuses.value : {}, mergeability),
    ...(query && sections.length === 0
      ? { note: `No section matches "${input.section}". Sections: ${inbox.sections.map((s) => s.name).join(", ")}` }
      : {}),
    ...(hiddenCount > 0 ? { hiddenSections: hiddenCount } : {}),
    ...(statuses.status === "rejected"
      ? {
          githubUnavailable: `Reviews, comments, and checks are missing: ${
            statuses.reason instanceof Error ? statuses.reason.message : String(statuses.reason)
          }`,
        }
      : {}),
  };
}
