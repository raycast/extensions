import { PullRequest } from "../components/pullRequests/interface";

// PR ids repeat across repos, so callers needing a globally-unique key
// (React list keys, cross-repo id Sets) must scope it by repo.
export function getPullRequestKey(pr: PullRequest): string {
  return `${pr.repo.slug}#${pr.id}`;
}
