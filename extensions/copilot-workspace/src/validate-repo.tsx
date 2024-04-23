const repoRegex = /^[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+$/;

export function validateRepo(repo: string): boolean {
  return repoRegex.test(repo);
}
