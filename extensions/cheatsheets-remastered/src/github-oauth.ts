import { OAuthService } from "@raycast/utils";

// GitHub OAuth service with required scopes for repository access
export const githubOAuth = OAuthService.github({
  scope: "repo read:org read:user",
});

export default githubOAuth;
