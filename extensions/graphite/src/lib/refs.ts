/** Identifies a pull request across the Graphite and GitHub APIs. */
export type PullRequestRef = { owner: string; repo: string; number: number };

/** Stable, case-insensitive key for a pull request, e.g. `acme/web#12`. Shared by data and UI code. */
export const refKey = (ref: PullRequestRef) => `${ref.owner}/${ref.repo}#${ref.number}`.toLowerCase();
