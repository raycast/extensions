import { fetchMergeability } from "./api";
import { Downstack, findDownstack, PullRequestRef } from "./github";
import { findGraphiteRepositories, findRepositoryForSlug, readGraphiteTrunks } from "./repositories";

/** The stack Graphite would merge for a pull request, bottom first, like `gt merge`. */
export async function planMerge(ref: PullRequestRef): Promise<Downstack> {
  let knownTrunks: string[] = [];
  try {
    const repository = findRepositoryForSlug(await findGraphiteRepositories(), ref.owner, ref.repo);
    knownTrunks = repository ? await readGraphiteTrunks(repository.path) : [];
  } catch {
    // Local discovery is optional; the stack walk also recognizes common trunks.
  }
  return findDownstack(ref, knownTrunks);
}

/** Graphite's mergeability verdict for one pull request, e.g. `READY_TO_MERGE` or `NEEDS_APPROVALS`. */
export async function mergeabilityOf(ref: PullRequestRef): Promise<string | undefined> {
  return (await fetchMergeability(ref.owner, ref.repo, [ref.number]))[ref.number];
}
