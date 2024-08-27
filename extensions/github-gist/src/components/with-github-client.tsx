import { withAccessToken } from "@raycast/utils";
import React from "react";
import { githubOAuthService } from "../api/oauth";

export function withGitHubClient(Component: React.ComponentType) {
  return withAccessToken(githubOAuthService)(Component);
}
