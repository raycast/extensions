import { getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { GraphQLClient } from "graphql-request";
import fetch from "node-fetch";
import { Octokit } from "octokit";

import { getSdk } from "../generated/graphql";

let github: ReturnType<typeof getSdk> | null = null;
let octokit: Octokit | null = null;

const preferences = getPreferenceValues<Preferences>();
const restApiEndpoint = preferences.restApiEndpoint || preferences.graphqlEndpoint.replace("/api/graphql", "/api/v3");

function onAuthorize({ token, type }: { token: string; type: string }) {
  const authorization = type === "personal" ? `token ${token}` : `bearer ${token}`;

  github = getSdk(new GraphQLClient(preferences.graphqlEndpoint, { headers: { authorization } }));
  octokit = new Octokit({
    baseUrl: restApiEndpoint,
    auth: token,
    request: { fetch },
  });
}

export const githubOAuthService = OAuthService.github({
  personalAccessToken: preferences.token,
  scope: "notifications repo project read:org read:user",
  onAuthorize,
});

export function getGitHubClient() {
  if (!github || !octokit) {
    throw new Error("GitHub clients not initialized");
  }

  return { github, octokit };
}
