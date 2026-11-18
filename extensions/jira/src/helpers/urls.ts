import { getJiraCredentials } from "../api/jiraCredentials";

export function normalizeJiraSiteUrl(siteUrl: string) {
  return siteUrl.startsWith("https://") ? siteUrl : `https://${siteUrl}`;
}

export function getIssueUrl(issueKey: string, siteUrl?: string) {
  const resolvedSiteUrl = siteUrl ?? getJiraCredentials().siteUrl;
  return `${normalizeJiraSiteUrl(resolvedSiteUrl)}/browse/${issueKey}`;
}
