import { getAccessToken, OAuthService } from "@raycast/utils";

import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { fetch } from "cross-fetch";

import { githubApiUrl } from "../../constants";

const github = OAuthService.github({
  scope: "",
});
export const authorize = github.authorize;

// TODO: use Raycast cache?
const cache = new InMemoryCache();

export function getGithubApi({ token, type }: ReturnType<typeof getAccessToken>) {
  const authorization = type === "personal" ? `token ${token}` : `bearer ${token}`;

  return new ApolloClient({
    cache,
    link: new HttpLink({
      uri: `${githubApiUrl}/graphql`,
      fetch,
      headers: { authorization },
    }),
  });
}
