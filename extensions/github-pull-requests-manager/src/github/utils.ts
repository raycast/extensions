import { PullRequest } from "./types/pr";

export function getRepoName(pr: PullRequest): string {
  return pr.repository_url.split("/").slice(-2).join("/");
}

export function parseLabels(filterLabel?: string): string[] {
  return (filterLabel ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** True when no label filter is set, or the PR has at least one of the labels (case-insensitive, like GitHub). */
export function matchesLabels(pr: PullRequest, labels: string[]): boolean {
  return labels.length === 0 || pr.labels.some((l) => labels.includes(l.name.toLowerCase()));
}
