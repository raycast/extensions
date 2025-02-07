import { getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import fetch from "node-fetch";

import { User } from "./users";

type JiraCredentials = {
  cloudId?: string;
  siteUrl: string;
  authorizationHeader: string;
  apiVersion: string;
  myself: User;
};

export const jiraWithApiToken = {
  authorize: async () => {
    const { siteUrl, token, email, personalAccessToken, apiVersion } = getPreferenceValues();

    let hostname;
    try {
      hostname = new URL(siteUrl).host;
    } catch (error) {
      // If the URL isn't valid, assume a hostname was entered directly
      hostname = siteUrl;
    }

    let authorizationHeader;
    if (personalAccessToken) {
      authorizationHeader = `Bearer ${token}`;
    } else {
      authorizationHeader = `Basic ${btoa(`${email}:${token}`)}`;
    }

    const myselfResponse = await fetch(`https://${hostname}/rest/api/${apiVersion}/myself`, {
      headers: {
        Authorization: authorizationHeader,
        Accept: "application/json",
      },
    });

    try {
      const myself = (await myselfResponse.json()) as User;
      jiraCredentials = {
        siteUrl: hostname,
        apiVersion: apiVersion,
        authorizationHeader: authorizationHeader,
        myself: myself,
      };
    } catch (error) {
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
        apiVersion: "3",
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
