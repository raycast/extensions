import { getPreferenceValues } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { jira, jiraWithApiToken } from "../api/jiraCredentials";

export function withJiraCredentials<T>(Component: React.ComponentType<T>) {
  const { token, email, siteUrl, personalAccessToken } = getPreferenceValues<Preferences>();

  return withAccessToken<T>(token && (email || personalAccessToken) && siteUrl ? jiraWithApiToken : jira)(Component);
}
