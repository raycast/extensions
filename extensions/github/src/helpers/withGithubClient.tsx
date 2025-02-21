import { withAccessToken } from "@raycast/utils";

import { githubOAuthService } from "../api/githubClient";

export const withGitHubClient = withAccessToken(githubOAuthService);
