/**
 * Jira URL validation and parsing utilities
 * Supports both unscoped and scoped API token formats
 *
 * Reference: https://jira.atlassian.com/browse/CLOUD-12617
 */

export type JiraTokenType = "unscoped" | "scoped";

export interface JiraUrlInfo {
  tokenType: JiraTokenType;
  baseUrl: string;
  cloudId?: string;
  isValid: boolean;
  error?: string;
}

/**
 * Validates and parses a Jira URL
 *
 * @param jiraUrl - Jira base URL (with or without trailing slash)
 * @returns Information about the URL format and validity
 *
 * @example
 * // Unscoped token format
 * parseJiraUrl("https://mysite.atlassian.net")
 * // Returns: { tokenType: "unscoped", baseUrl: "https://mysite.atlassian.net", isValid: true }
 *
 * @example
 * // Scoped token format
 * parseJiraUrl("https://api.atlassian.com/ex/jira/abc123")
 * // Returns: { tokenType: "scoped", baseUrl: "https://api.atlassian.com/ex/jira/abc123", cloudId: "abc123", isValid: true }
 */
export function parseJiraUrl(jiraUrl: string | undefined): JiraUrlInfo {
  if (!jiraUrl || jiraUrl.trim().length === 0) {
    return {
      tokenType: "unscoped",
      baseUrl: "",
      isValid: false,
      error: "Jira URL is empty",
    };
  }

  const cleanUrl = jiraUrl.trim().replace(/\/$/, "");

  // Check for scoped token format: api.atlassian.com/ex/jira/{cloudId}
  if (cleanUrl.includes("api.atlassian.com/ex/jira")) {
    const cloudIdMatch = cleanUrl.match(/api\.atlassian\.com\/ex\/jira\/([a-zA-Z0-9-]+)/);
    if (cloudIdMatch && cloudIdMatch[1]) {
      return {
        tokenType: "scoped",
        baseUrl: cleanUrl,
        cloudId: cloudIdMatch[1],
        isValid: true,
      };
    }

    return {
      tokenType: "scoped",
      baseUrl: cleanUrl,
      isValid: false,
      error: "Invalid scoped token URL format. Expected: https://api.atlassian.com/ex/jira/{cloudId}",
    };
  }

  // Check for unscoped token format: *.atlassian.net
  if (cleanUrl.match(/https?:\/\/[a-zA-Z0-9-]+\.atlassian\.net/)) {
    return {
      tokenType: "unscoped",
      baseUrl: cleanUrl,
      isValid: true,
    };
  }

  return {
    tokenType: "unscoped",
    baseUrl: cleanUrl,
    isValid: false,
    error:
      "Invalid Jira URL format. Expected: https://mysite.atlassian.net or https://api.atlassian.com/ex/jira/{cloudId}",
  };
}

/**
 * Validates that a Jira URL is properly configured
 *
 * @param jiraUrl - Jira base URL
 * @returns true if URL is valid for the detected token type
 */
export function isValidJiraUrl(jiraUrl: string | undefined): boolean {
  return parseJiraUrl(jiraUrl).isValid;
}

/**
 * Gets helpful error message if Jira URL is invalid
 *
 * @param jiraUrl - Jira base URL
 * @returns Error message, or undefined if URL is valid
 */
export function getJiraUrlError(jiraUrl: string | undefined): string | undefined {
  return parseJiraUrl(jiraUrl).error;
}

/**
 * Detects token type from Jira URL
 * Useful for providing user-friendly guidance
 *
 * @param jiraUrl - Jira base URL
 * @returns Token type ("scoped" or "unscoped")
 */
export function getJiraTokenType(jiraUrl: string | undefined): JiraTokenType {
  return parseJiraUrl(jiraUrl).tokenType;
}

/**
 * Extracts cloud ID from scoped token URL
 *
 * @param jiraUrl - Jira base URL in scoped format
 * @returns Cloud ID, or undefined if not found
 *
 * @example
 * extractCloudId("https://api.atlassian.com/ex/jira/abc123def456")
 * // Returns: "abc123def456"
 */
export function extractCloudId(jiraUrl: string | undefined): string | undefined {
  return parseJiraUrl(jiraUrl).cloudId;
}

/**
 * Constructs full scoped token URL from Cloud ID
 *
 * @param cloudId - Cloud ID from Atlassian organization
 * @returns Full scoped token URL
 *
 * @example
 * buildScopedTokenUrl("e6f310ff-605a-4f7c-b043-5d591d075292")
 * // Returns: "https://api.atlassian.com/ex/jira/e6f310ff-605a-4f7c-b043-5d591d075292"
 */
export function buildScopedTokenUrl(cloudId: string): string {
  if (!cloudId || cloudId.trim().length === 0) {
    throw new Error("Cloud ID cannot be empty");
  }
  return `https://api.atlassian.com/ex/jira/${cloudId.trim()}`;
}

/**
 * Helper function to construct correct Jira URL from Cloud ID
 * Shows user-friendly error if Cloud ID is invalid
 *
 * @param cloudId - Cloud ID or organization UUID
 * @returns Object with URL and helpful message
 */
export function buildJiraUrlFromCloudId(cloudId: string | undefined): {
  url?: string;
  isValid: boolean;
  message: string;
} {
  if (!cloudId || cloudId.trim().length === 0) {
    return {
      isValid: false,
      message: "Cloud ID is required. Find it at https://admin.atlassian.com/o/{cloudId}/overview",
    };
  }

  const trimmedId = cloudId.trim();

  // Check if it looks like a UUID (rough validation)
  if (!trimmedId.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)) {
    return {
      isValid: false,
      message: `Invalid Cloud ID format. Expected UUID like: e6f310ff-605a-4f7c-b043-5d591d075292`,
    };
  }

  return {
    url: buildScopedTokenUrl(trimmedId),
    isValid: true,
    message: `✅ Scoped token URL: https://api.atlassian.com/ex/jira/${trimmedId}`,
  };
}
