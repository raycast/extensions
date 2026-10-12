import type { ComponentType } from "react";

import { getPreferenceValues } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { jira, jiraWithApiToken } from "../api/jiraCredentials";

export function withJiraCredentialsComponent<T extends Record<string, unknown> = Record<string, unknown>>(
  Component: ComponentType<T>,
) {
  const { token, email, siteUrl } = getPreferenceValues<Preferences>();
  const credentials = token && email && siteUrl ? jiraWithApiToken : jira;

  return withAccessToken<T>(credentials)(Component);
}

export function withJiraCredentials<T, R>(fn: (input: T) => Promise<R> | R) {
  const { token, email, siteUrl } = getPreferenceValues<Preferences>();
  const credentials = token && email && siteUrl ? jiraWithApiToken : jira;

  return withAccessToken<T>(credentials)(async (input: T) => {
    try {
      return await fn(input);
    } catch (error) {
      if (isOAuthInvalidGrantError(error)) {
        throw new Error(
          "Your Jira session has expired or was revoked. Please reconnect Jira in Raycast extension preferences and try again.",
        );
      }

      throw error;
    }
  });
}

function isOAuthInvalidGrantError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("invalid_grant");
}
