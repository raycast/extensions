import { getPreferenceValues } from "@raycast/api";

import { jiraFetch } from "./httpClient";
import { User } from "./users";

type JiraCredentials = {
  siteUrl: string;
  authorizationHeader: string;
  myself: User;
};

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const jiraWithApiToken = {
  authorize: async () => {
    const { siteUrl, username, token, authType } = getPreferenceValues<Preferences>();
    const baseUrl = normalizeUrl(siteUrl);

    const authorizationHeader =
      authType === "bearer" ? `Bearer ${token}` : `Basic ${Buffer.from(`${username}:${token}`).toString("base64")}`;

    const myselfResponse = await jiraFetch(`${baseUrl}/rest/api/2/myself`, {
      headers: {
        Authorization: authorizationHeader,
        Accept: "application/json",
      },
    });

    if (!myselfResponse.ok) {
      throw new Error(
        `Authentication failed (HTTP ${myselfResponse.status}). Please check your credentials in the extension preferences.`,
      );
    }

    const myself = (await myselfResponse.json()) as User;

    jiraCredentials = {
      siteUrl: baseUrl,
      authorizationHeader,
      myself,
    };

    return token;
  },
};

let jiraCredentials: JiraCredentials | null = null;

export function getJiraCredentials() {
  if (!jiraCredentials) {
    throw new Error("getJiraCredentials must be used when authenticated");
  }

  return jiraCredentials;
}
