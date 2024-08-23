const repoRegex = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

export function validateRepo(repo: string): boolean {
  return repoRegex.test(repo);
}
