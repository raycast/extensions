import { getPreferenceValues } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { jira, jiraWithApiToken } from "../api/jiraCredentials";

export function withJiraCredentials<T>(Component: React.ComponentType<T>) {
  const prefs = getPreferenceValues();
  if (prefs.token && prefs.email && prefs.siteUrl) {
    return withAccessToken<T>(jiraWithApiToken)(Component);
  }
  return withAccessToken<T>(jira)(Component);
}
