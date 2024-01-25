import { withAccessToken } from "@raycast/utils";

import { githubOAuthService } from "../api/githubClient";

export function withGitHubClient<T>(Component: React.ComponentType<T>) {
  return withAccessToken<T>(githubOAuthService)(Component);
}
