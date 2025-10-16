import { Octokit } from "@octokit/rest";
import { getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { GraphQLClient } from "graphql-request";
import fetch from "node-fetch";

import { getSdk } from "../generated/graphql";

let github: ReturnType<typeof getSdk> | null = null;
let octokit: Octokit | null = null;

const preferences = getPreferenceValues<Preferences>();

function onAuthorize({ token, type }: { token: string; type: string }) {
  const authorization = type === "personal" ? `token ${token}` : `bearer ${token}`;

  github = getSdk(new GraphQLClient("https://api.github.com/graphql", { headers: { authorization } }));
  octokit = new Octokit({ auth: token, request: { fetch } });
}

export const githubOAuthService = OAuthService.github({
  personalAccessToken: preferences.personalAccessToken,
  scope: "notifications repo project read:org read:user",
  onAuthorize,
});

export function getGitHubClient() {
  if (!github || !octokit) {
    throw new Error("GitHub clients not initialized");
  }

  return { github, octokit };
}
