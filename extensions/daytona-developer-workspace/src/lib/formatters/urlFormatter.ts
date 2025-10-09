/**
 * URL formatting utilities
 * Repository URL parsing and display formatting
 */

export interface ParsedRepositoryUrl {
  provider: "github" | "gitlab" | "bitbucket" | "azure" | "other";
  owner?: string;
  repository?: string;
  branch?: string;
  path?: string;
  protocol: "https" | "ssh" | "git";
  displayName: string;
  shortName: string;
  webUrl?: string;
}

/**
 * Parse a repository URL into its components
 */
export function parseRepositoryUrl(url: string): ParsedRepositoryUrl {
  if (!url) {
    return {
      provider: "other",
      protocol: "https",
      displayName: "Unknown Repository",
      shortName: "Unknown",
    };
  }

  try {
    // Handle SSH URLs (git@github.com:owner/repo.git)
    const sshMatch = url.match(/^git@([^:]+):([^/]+)\/([^/.]+)(\.git)?$/);
    if (sshMatch) {
      const [, host, owner, repo] = sshMatch;
      const provider = getProviderFromHost(host);
      return {
        provider,
        owner,
        repository: repo,
        protocol: "ssh",
        displayName: `${owner}/${repo}`,
        shortName: repo,
        webUrl: getWebUrl(provider, owner, repo),
      };
    }

    // Handle HTTPS URLs
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

    if (pathParts.length >= 2) {
      const owner = pathParts[0];
      const repo = pathParts[1].replace(/\.git$/, "");
      const provider = getProviderFromHost(parsedUrl.hostname);

      return {
        provider,
        owner,
        repository: repo,
        branch: parsedUrl.searchParams.get("branch") || undefined,
        path: pathParts.slice(2).join("/") || undefined,
        protocol: "https",
        displayName: `${owner}/${repo}`,
        shortName: repo,
        webUrl: getWebUrl(provider, owner, repo),
      };
    }

    return {
      provider: getProviderFromHost(parsedUrl.hostname),
      protocol: "https",
      displayName: url,
      shortName: parsedUrl.hostname,
    };
  } catch {
    return {
      provider: "other",
      protocol: "https",
      displayName: url,
      shortName: "Invalid URL",
    };
  }
}

/**
 * Get provider from hostname
 */
function getProviderFromHost(hostname: string): ParsedRepositoryUrl["provider"] {
  const host = hostname.toLowerCase();

  if (host.includes("github")) return "github";
  if (host.includes("gitlab")) return "gitlab";
  if (host.includes("bitbucket")) return "bitbucket";
  if (host.includes("dev.azure") || host.includes("visualstudio.com")) return "azure";

  return "other";
}

/**
 * Get web URL from provider and repository info
 */
function getWebUrl(provider: ParsedRepositoryUrl["provider"], owner?: string, repo?: string): string | undefined {
  if (!owner || !repo) return undefined;

  switch (provider) {
    case "github":
      return `https://github.com/${owner}/${repo}`;
    case "gitlab":
      return `https://gitlab.com/${owner}/${repo}`;
    case "bitbucket":
      return `https://bitbucket.org/${owner}/${repo}`;
    default:
      return undefined;
  }
}

/**
 * Format repository URL for display
 */
export function formatRepositoryUrl(url: string, maxLength = 50): string {
  const parsed = parseRepositoryUrl(url);

  if (parsed.displayName.length <= maxLength) {
    return parsed.displayName;
  }

  // Truncate middle part of long URLs
  const start = Math.floor(maxLength / 2) - 2;
  const end = maxLength - start - 3;

  return `${parsed.displayName.slice(0, start)}...${parsed.displayName.slice(-end)}`;
}

/**
 * Get repository short name for display
 */
export function getRepositoryShortName(url: string): string {
  return parseRepositoryUrl(url).shortName;
}

/**
 * Format branch name for display
 */
export function formatBranchName(branch: string, maxLength = 20): string {
  if (!branch) return "main";

  if (branch.length <= maxLength) return branch;

  return `${branch.slice(0, maxLength - 3)}...`;
}

/**
 * Get provider icon name
 */
export function getProviderIcon(url: string): string {
  const provider = parseRepositoryUrl(url).provider;

  switch (provider) {
    case "github":
      return "github-logo";
    case "gitlab":
      return "gitlab-logo";
    case "bitbucket":
      return "bitbucket-logo";
    case "azure":
      return "azure-logo";
    default:
      return "git-branch";
  }
}

/**
 * Check if URL is a valid repository URL
 */
export function isValidRepositoryUrl(url: string): boolean {
  if (!url) return false;

  try {
    // Check SSH format
    if (/^git@[^:]+:[^/]+\/[^/]+\.git?$/.test(url)) return true;

    // Check HTTPS format
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    return pathParts.length >= 2;
  } catch {
    return false;
  }
}

/**
 * Convert SSH URL to HTTPS URL
 */
export function sshToHttpsUrl(sshUrl: string): string {
  const sshMatch = sshUrl.match(/^git@([^:]+):([^/]+)\/([^/.]+)(\.git)?$/);
  if (!sshMatch) return sshUrl;

  const [, host, owner, repo] = sshMatch;
  return `https://${host}/${owner}/${repo}`;
}

/**
 * Convert HTTPS URL to SSH URL
 */
export function httpsToSshUrl(httpsUrl: string): string {
  try {
    const parsed = new URL(httpsUrl);
    const pathParts = parsed.pathname.split("/").filter(Boolean);

    if (pathParts.length >= 2) {
      const owner = pathParts[0];
      const repo = pathParts[1].replace(/\.git$/, "");
      return `git@${parsed.hostname}:${owner}/${repo}.git`;
    }
  } catch {
    // If parsing fails, return original URL
  }

  return httpsUrl;
}

/**
 * Extract file path from repository URL
 */
export function extractFilePath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);

    if (pathParts.length > 2) {
      return pathParts.slice(2).join("/");
    }
  } catch {
    // If parsing fails, return null
  }

  return null;
}
