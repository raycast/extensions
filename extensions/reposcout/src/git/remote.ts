/**
 * Pure conversions for Git remote URLs. No process execution happens here, so
 * every branch is unit-testable. Supports the common remote formats produced by
 * GitHub, GitLab, Bitbucket, and generic SSH hosts.
 */

/**
 * Convert a raw Git remote URL into a browsable https URL.
 *
 * Handles:
 *  - `git@host:owner/repo.git`         (scp-like SSH)
 *  - `ssh://git@host/owner/repo.git`   (SSH URL)
 *  - `https://host/owner/repo.git`     (HTTPS, credentials stripped)
 *  - `git://host/owner/repo.git`       (Git protocol)
 *
 * @param remoteUrl A raw remote URL, or `null`.
 * @returns The normalized https URL, or `null` when it cannot be derived.
 */
export function toWebUrl(remoteUrl: string | null): string | null {
  if (!remoteUrl) {
    return null;
  }
  const trimmed = remoteUrl.trim();
  if (trimmed.length === 0) {
    return null;
  }

  // scp-like syntax: git@github.com:owner/repo.git
  const scpMatch = /^[a-zA-Z0-9._-]+@([^:/]+):(.+)$/.exec(trimmed);
  if (scpMatch) {
    const host = scpMatch[1] as string;
    const path = stripGitSuffix(scpMatch[2] as string);
    return `https://${host}/${path}`;
  }

  // URL syntax: ssh://, https://, http://, git://
  const urlMatch = /^(?:ssh|git|https?):\/\/(?:[^@/]+@)?([^/:]+)(?::\d+)?\/(.+)$/.exec(trimmed);
  if (urlMatch) {
    const host = urlMatch[1] as string;
    const path = stripGitSuffix(urlMatch[2] as string);
    return `https://${host}/${path}`;
  }

  return null;
}

/** Remove a single trailing `.git` and any surrounding slashes from a path. */
function stripGitSuffix(path: string): string {
  return path.replace(/\/+$/, "").replace(/\.git$/, "");
}
