import { PullRequest } from "./types/pr";

export function getRepoName(pr: PullRequest): string {
  return pr.repository_url.split("/").slice(-2).join("/");
}
