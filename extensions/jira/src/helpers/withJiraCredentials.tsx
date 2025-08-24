import { getPreferenceValues } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { jira, jiraWithApiToken } from "../api/jiraCredentials";

export function withJiraCredentials<T, R>(fn: (input: T) => Promise<R> | R) {
  const { token, email, siteUrl } = getPreferenceValues<Preferences>();

  return withAccessToken<T>(token && email && siteUrl ? jiraWithApiToken : jira)(fn);
}
