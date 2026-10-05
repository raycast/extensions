/**
 * Validates a Git URL.
 * @param url - The URL to validate.
 * @returns An error message if the URL is invalid, otherwise undefined.
 */
export function validateGitUrl(url: string): string | undefined {
  if (!url.trim()) return "Required";

  // Check SSH format (git@github.com:username/repo.git)
  const sshPattern = /^(?:ssh:\/\/)?(?:[^@]+@)?[^:]+:[^/]+\/.*\.git$/;

  // Check HTTP/HTTPS format (https://github.com/username/repo.git)
  const httpPattern = /^https?:\/\/(?:.*@)?[^/]+\/.*(?:\.git)?$/;

  if (sshPattern.test(url) || httpPattern.test(url)) {
    return undefined;
  }

  return "Incorrect SSH or HTTP format";
}

/**
 * Extracts repository name from git URL.
 * Handles both HTTPS and SSH URLs.
 */
export function extractRepoNameFromUrl(url: string): string {
  // Regular expression to extract repository name from URL
  // Supports HTTPS and SSH formats URLs
  const repoNameRegex = /(?:\/|:)(?<repoName>[^/]+?)(?:\.git)?$/;
  const match = url.match(repoNameRegex);

  // Extract repository name from named capture group
  if (match && match.groups && match.groups.repoName) {
    return match.groups.repoName;
  }

  // Default value if not found
  return "repository";
}
