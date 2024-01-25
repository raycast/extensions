import { withAccessToken } from "@raycast/utils";

import { jira } from "../api/jiraCredentials";

export function withJiraCredentials<T>(Component: React.ComponentType<T>) {
  return withAccessToken<T>(jira)(Component);
}
