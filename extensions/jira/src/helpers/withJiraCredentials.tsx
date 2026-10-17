import { environment, getPreferenceValues } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { ComponentType, createElement } from "react";

import { jira, jiraWithApiToken } from "../api/jiraCredentials";

export function withJiraCredentials<T, R>(fn: (input: T) => Promise<R> | R) {
  const { token, email, siteUrl } = getPreferenceValues<Preferences>();
  const service = token && email && siteUrl ? jiraWithApiToken : jira;

  if (environment.commandMode === "no-view") {
    return withAccessToken<T>(service)(async (input: T) => {
      try {
        return await fn(input);
      } catch (error) {
        throw mapJiraError(error);
      }
    });
  }

  const Component = fn as unknown as ComponentType<T & object>;
  return withAccessToken<T>(service)((props: T) => {
    return createElement(Component, props as T & object);
  });
}

function mapJiraError(error: unknown) {
  if (isOAuthInvalidGrantError(error)) {
    return new Error(
      "Your Jira session has expired or was revoked. Please reconnect Jira in Raycast extension preferences and try again.",
    );
  }

  return error;
}

function isOAuthInvalidGrantError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("invalid_grant");
}
