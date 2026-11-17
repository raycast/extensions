import { useCachedPromise } from "@raycast/utils";
import { fetchMergeability } from "../lib/api";
import {
  fetchStatuses,
  GitHubUnavailableError,
  GitHubUnavailableReason,
  PullRequestRef,
  PullRequestStatus,
  refKey,
} from "../lib/github";

export type StatusLookup = {
  /** GitHub facts per PR, keyed by `refKey`. Empty when `gh` is unavailable. */
  github: Record<string, PullRequestStatus>;
  /** Graphite mergeability per PR, keyed by `refKey`. */
  mergeability: Record<string, string>;
  /** Why GitHub data is missing, if it is. Kept as plain data so it survives Raycast's cache. */
  githubUnavailable?: { reason: GitHubUnavailableReason; message: string };
  /** Open PRs GitHub returned nothing for, e.g. a repository the `gh` account can't access or that needs SSO. */
  inaccessibleCount?: number;
};

async function loadStatuses(serializedRefs: string): Promise<StatusLookup> {
  const refs: PullRequestRef[] = serializedRefs
    ? serializedRefs.split("\n").map((line) => {
        const [owner, repo, number] = line.split(" ");
        return { owner, repo, number: Number(number) };
      })
    : [];

  const byRepo = new Map<string, PullRequestRef[]>();
  for (const ref of refs) {
    const key = `${ref.owner}/${ref.repo}`;
    byRepo.set(key, [...(byRepo.get(key) ?? []), ref]);
  }

  const [github, ...mergeabilityByRepo] = await Promise.allSettled([
    fetchStatuses(refs),
    ...[...byRepo.values()].map(async (repoRefs) => {
      const { owner, repo } = repoRefs[0];
      const statuses = await fetchMergeability(
        owner,
        repo,
        repoRefs.map((ref) => ref.number),
      );
      return repoRefs.flatMap((ref): [string, string][] => {
        const status = statuses[ref.number];
        return status ? [[refKey(ref), status]] : [];
      });
    }),
  ]);

  const mergeability: Record<string, string> = {};
  for (const result of mergeabilityByRepo) {
    if (result.status === "fulfilled") Object.assign(mergeability, Object.fromEntries(result.value));
  }

  if (github.status === "fulfilled") {
    const uniqueKeys = new Set(refs.map(refKey));
    const inaccessibleCount = [...uniqueKeys].filter((key) => !(key in github.value)).length;
    return { github: github.value, mergeability, inaccessibleCount };
  }
  const error = github.reason;
  return {
    github: {},
    mergeability,
    githubUnavailable:
      error instanceof GitHubUnavailableError
        ? { reason: error.reason, message: error.message }
        : { reason: "FAILED", message: error instanceof Error ? error.message : String(error) },
  };
}

/**
 * Review, comment, check and merge facts for a list of PRs. Fetched in the background after the list renders,
 * so a slow GitHub never blocks the inbox.
 */
export function usePullRequestStatuses(refs: PullRequestRef[]) {
  const serialized = [...new Set(refs.map((ref) => `${ref.owner} ${ref.repo} ${ref.number}`))].sort().join("\n");
  const { data, isLoading, revalidate } = useCachedPromise(loadStatuses, [serialized], {
    execute: serialized.length > 0,
    keepPreviousData: true,
  });
  return { lookup: data, isLoading, revalidate };
}
