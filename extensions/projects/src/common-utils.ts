import { SourceRepo } from "./types";

export function getRepoKey(repo: SourceRepo): string {
  return `${repo.fullPath}~${repo.type}`;
}
