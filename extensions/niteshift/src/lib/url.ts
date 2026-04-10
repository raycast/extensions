/**
 * Convert a GitHub full-name (owner/repo) to the slug used in Niteshift web URLs.
 * Mirrors `repoFullNameToSlug` from niteshift-cli/src/utils/git.ts.
 */
export function repoFullNameToSlug(fullName: string): string {
  if (!fullName) return "";
  return fullName.replace(/\//g, "__");
}

/**
 * Build a user-facing task URL for the Niteshift web app.
 */
export function buildTaskUrl(baseUrl: string, repoFullName: string, taskId: string): string {
  const slug = repoFullNameToSlug(repoFullName);
  return new URL(`/repo/${slug}/${taskId}`, baseUrl).toString();
}
