import { getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { GraphQLClient } from "graphql-request";
import { Octokit } from "octokit";

import { getSdk } from "../generated/graphql";

let github: ReturnType<typeof getSdk> | null = null;
let octokit: Octokit | null = null;

const preferences = getPreferenceValues<Preferences>();

export const githubOAuthService = OAuthService.github({
  personalAccessToken: preferences.personalAccessToken,
  scope: "notifications repo read:org read:user read:project",
  onAuthorize({ token, type }) {
    const authorization = type === "personal" ? `token ${token}` : `bearer ${token}`;

    github = getSdk(new GraphQLClient("https://api.github.com/graphql", { headers: { authorization } }));
    octokit = new Octokit({ auth: token });
  },
});

export function getGitHubClient() {
  if (!github || !octokit) {
    throw new Error("GitHub clients not initialized");
  }

  return { github, octokit };
}
