import { PullRequest } from "../github/types";

export interface RepoGroup {
  repo: string;
  pullRequests: PullRequest[];
}

export function groupByRepo(pullRequests: PullRequest[]): RepoGroup[] {
  const groups = new Map<string, PullRequest[]>();
  for (const pr of pullRequests) {
    const existing = groups.get(pr.repo);
    if (existing) {
      existing.push(pr);
    } else {
      groups.set(pr.repo, [pr]);
    }
  }
  return Array.from(groups, ([repo, prs]) => ({ repo, pullRequests: prs }));
}

export function shortRepoName(repo: string): string {
  return repo.split("/").at(-1) ?? repo;
}
