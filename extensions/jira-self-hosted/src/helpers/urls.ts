import { getJiraCredentials } from "../api/jiraCredentials";
import { getBaseUrl, normalizeBaseUrl } from "../api/request";

/**
 * Builds the human-readable issue URL (`…/browse/KEY`).
 *
 * - If `explicitBaseUrl` is set (e.g. from preferences before auth), it is normalized and used.
 * - Otherwise uses the authenticated Jira base URL from {@link getJiraCredentials}.
 */
export function getIssueUrl(issueKey: string, explicitBaseUrl?: string): string {
  const base = normalizeBaseUrl(explicitBaseUrl ?? getJiraCredentials().siteUrl);
  return `${base}/browse/${issueKey}`;
}

/** Base URL from extension preferences only (no auth). For commands not wrapped in `withJiraCredentials`. */
export function getIssueUrlFromPreferences(issueKey: string): string {
  return getIssueUrl(issueKey, getBaseUrl());
}
