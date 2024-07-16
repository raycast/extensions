import { withAccessToken } from "@raycast/utils";

import { githubOAuthService } from "../api/githubClient";

export function withGitHubClient(Component: React.ComponentType) {
  return withAccessToken(githubOAuthService)(Component);
}
