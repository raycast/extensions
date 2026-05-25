import { withAccessToken } from "@raycast/utils";

import { jiraWithApiToken } from "../api/jiraCredentials";

// withAccessToken types only cover React components and () => void functions.
// Raycast AI tools are async parametrized functions — cast is required at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withJiraCredentials<T>(fn: any): any {
  return withAccessToken(jiraWithApiToken)(fn as React.ComponentType<T>);
}
