import { getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import fetch from "node-fetch";

import { User } from "./users";

type JiraCredentials = {
  cloudId?: string;
  siteUrl: string;
  authorizationHeader: string;
  myself: User;
};

export const jiraWithApiToken = {
  authorize: async () => {
    const prefs = getPreferenceValues<{
      siteUrl?: string;
      token?: string;
      email?: string;
    }>();

    // Use environment variables to fill missing fields only when at least one preference is provided.
    // This preserves the existing flow where empty preferences imply OAuth in withJiraCredentials.tsx.
    const hasAnyPreference =
      Boolean(prefs.siteUrl && prefs.siteUrl.trim()) ||
      Boolean(prefs.email && prefs.email.trim()) ||
      Boolean(prefs.token && prefs.token.trim());

    if (!hasAnyPreference) {
      // No preferences provided: this path should not be used (OAuth flow will be selected).
      throw new Error(
        "API token authentication requires preferences. Please set Site URL, Email, and API Token in the extension preferences.",
      );
    }

    const rawSite = (prefs.siteUrl || process.env.JIRA_DOMAIN || process.env.JIRA_SITE_URL || "").trim();
    const email = (prefs.email || process.env.JIRA_EMAIL || "").trim();
    const token = (prefs.token || process.env.JIRA_API_TOKEN || "").trim();

    if (!rawSite || !email || !token) {
      throw new Error(
        "Missing Jira credentials. Please configure site URL, email, and API token in Raycast preferences or via environment variables (JIRA_DOMAIN/JIRA_SITE_URL, JIRA_EMAIL, JIRA_API_TOKEN).",
      );
    }

    let hostname;
    try {
      hostname = new URL(rawSite).host;
    } catch {
      // If the URL isn't valid, assume a hostname was entered directly
      hostname = rawSite.replace(/^https?:\/\//i, "");
    }

    // Use Buffer for robust base64 across platforms/environments
    const authorizationHeader = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
    const myselfResponse = await fetch(`https://${hostname}/rest/api/3/myself`, {
      headers: {
        Authorization: authorizationHeader,
        Accept: "application/json",
      },
    });

    try {
      const myself = (await myselfResponse.json()) as User;
      jiraCredentials = {
        siteUrl: hostname,
        authorizationHeader: authorizationHeader,
        myself: myself,
      };
    } catch {
      throw new Error(
        `Error authenticating with Jira. Error code: ${myselfResponse.status}. Please check your credentials in the extension preferences.`,
      );
    }
    return token;
  },
};

export const jira = OAuthService.jira({
  clientId: "NAeIO0L9UVdGqKj5YF32HhcysfBCP31P",
  authorizeUrl: "https://jira.oauth.raycast.com/authorize",
  tokenUrl: "https://jira.oauth.raycast.com/token",
  refreshTokenUrl: "https://jira.oauth.raycast.com/refresh-token",
  scope: "read:jira-user read:jira-work write:jira-work offline_access read:sprint:jira-software",
  async onAuthorize({ token }) {
    const sitesResponse = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const sites = (await sitesResponse.json()) as { id: string; url: string }[];

    if (sites && sites.length > 0) {
      const site = sites[0];
      const authorizationHeader = `Bearer ${token}`;

      const myselfResponse = await fetch(`https://api.atlassian.com/ex/jira/${site.id}/rest/api/3/myself`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const myself = (await myselfResponse.json()) as User;

      jiraCredentials = {
        cloudId: site.id,
        siteUrl: site.url,
        authorizationHeader,
        myself,
      };
    }
  },
});

let jiraCredentials: JiraCredentials | null = null;

export function getJiraCredentials() {
  if (!jiraCredentials) {
    throw new Error("getJiraCredentials must be used when authenticated");
  }

  return jiraCredentials;
}
