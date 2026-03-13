import { getAccessToken, OAuthService, withAccessToken } from "@raycast/utils";

const github = OAuthService.github({
  scope: "gist",
});

export const withGitHubOAuth = withAccessToken(github);

export function getGitHubToken(): string {
  return getAccessToken().token;
}
