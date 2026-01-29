import { getPreferenceValues } from "@raycast/api";

export interface PRInfo {
  org: string;
  repo: string;
  prNumber: string;
}

export interface Preferences {
  graphiteHost: string;
  githubHost: string;
  allowlistEnabled: boolean;
  allowedOrgsRepos: string;
}

/**
 * Known Graphite domains (both .dev and .com are used)
 */
const KNOWN_GRAPHITE_HOSTS = ["app.graphite.dev", "app.graphite.com"];

/**
 * Get host domains from preferences, with fallback defaults
 */
function getHosts(): { graphiteHost: string; githubHost: string } {
  const prefs = getPreferenceValues<Preferences>();
  return {
    graphiteHost: (prefs.graphiteHost || "https://app.graphite.dev").replace(
      /\/$/,
      "",
    ),
    githubHost: (prefs.githubHost || "https://github.com").replace(/\/$/, ""),
  };
}

/**
 * Check if a URL host matches Graphite (either known hosts or configured custom host)
 */
function isGraphiteHost(url: URL): boolean {
  const { graphiteHost } = getHosts();
  const configuredHost = graphiteHost.replace(/^https?:\/\//, "");

  // Check against known Graphite hosts
  if (KNOWN_GRAPHITE_HOSTS.includes(url.host)) {
    return true;
  }

  // Check against configured custom host
  if (url.host === configuredHost) {
    return true;
  }

  return false;
}

/**
 * Check if a URL host matches GitHub (known github.com or configured custom host)
 */
function isGitHubHost(url: URL): boolean {
  const { githubHost } = getHosts();
  const configuredHost = githubHost.replace(/^https?:\/\//, "");

  // Check against known GitHub host
  if (url.host === "github.com") {
    return true;
  }

  // Check against configured custom host (for GitHub Enterprise)
  if (url.host === configuredHost) {
    return true;
  }

  return false;
}

/**
 * Parse a Graphite PR URL
 * Pattern: https://app.graphite.dev/github/pr/<org>/<repo>/<prNumber>/<optional-slug>
 * Also supports: https://app.graphite.com/github/pr/<org>/<repo>/<prNumber>/<optional-slug>
 */
export function parseGraphiteUrl(url: string): PRInfo | null {
  try {
    const parsed = new URL(url);

    // Check if URL is from a Graphite host
    if (!isGraphiteHost(parsed)) {
      return null;
    }

    const pathParts = parsed.pathname.split("/").filter(Boolean);

    // Expected: ["github", "pr", org, repo, prNumber, ...optional-slug]
    if (pathParts.length < 5) {
      return null;
    }

    if (pathParts[0] !== "github" || pathParts[1] !== "pr") {
      return null;
    }

    const org = pathParts[2];
    const repo = pathParts[3];
    const prNumber = pathParts[4];

    // Validate PR number is numeric
    if (!/^\d+$/.test(prNumber)) {
      return null;
    }

    return { org, repo, prNumber };
  } catch {
    return null;
  }
}

/**
 * Parse a GitHub PR URL
 * Pattern: https://github.com/<org>/<repo>/pull/<prNumber>
 */
export function parseGitHubUrl(url: string): PRInfo | null {
  try {
    const parsed = new URL(url);

    // Check if URL is from a GitHub host
    if (!isGitHubHost(parsed)) {
      return null;
    }

    const pathParts = parsed.pathname.split("/").filter(Boolean);

    // Expected: [org, repo, "pull", prNumber, ...optional-extras]
    if (pathParts.length < 4) {
      return null;
    }

    if (pathParts[2] !== "pull") {
      return null;
    }

    const org = pathParts[0];
    const repo = pathParts[1];
    // PR number might have trailing slash or query params stripped
    const prNumber = pathParts[3].split(/[?#]/)[0];

    // Validate PR number is numeric
    if (!/^\d+$/.test(prNumber)) {
      return null;
    }

    return { org, repo, prNumber };
  } catch {
    return null;
  }
}

/**
 * Convert PR info to GitHub URL
 */
export function toGitHubUrl(prInfo: PRInfo): string {
  const { githubHost } = getHosts();
  return `${githubHost}/${prInfo.org}/${prInfo.repo}/pull/${prInfo.prNumber}`;
}

/**
 * Convert PR info to Graphite URL
 */
export function toGraphiteUrl(prInfo: PRInfo): string {
  const { graphiteHost } = getHosts();
  return `${graphiteHost}/github/pr/${prInfo.org}/${prInfo.repo}/${prInfo.prNumber}`;
}

/**
 * Check if PR info matches the allowlist (if enabled)
 */
export function isAllowed(prInfo: PRInfo): boolean {
  const prefs = getPreferenceValues<Preferences>();

  if (!prefs.allowlistEnabled) {
    return true;
  }

  const allowlist = prefs.allowedOrgsRepos
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowlist.length === 0) {
    return true;
  }

  for (const entry of allowlist) {
    if (entry.includes("/")) {
      // org/repo format
      const [allowedOrg, allowedRepo] = entry.split("/");
      if (prInfo.org === allowedOrg && prInfo.repo === allowedRepo) {
        return true;
      }
    } else {
      // org-only format
      if (prInfo.org === entry) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detect URL type and parse accordingly
 */
export function detectAndParse(
  url: string,
): { type: "graphite" | "github"; prInfo: PRInfo } | null {
  const graphiteInfo = parseGraphiteUrl(url);
  if (graphiteInfo) {
    return { type: "graphite", prInfo: graphiteInfo };
  }

  const githubInfo = parseGitHubUrl(url);
  if (githubInfo) {
    return { type: "github", prInfo: githubInfo };
  }

  return null;
}
