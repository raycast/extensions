import { OAuthService, withAccessToken } from "@raycast/utils";
import got, { Got } from "got";
import { githubOauthScope } from "./constants.js";
import { githubPersonalAccessToken } from "./utils.js";

/**
 * GitHub API client instance.
 * @remarks The githubApi will be extended with the personal access token when the user authorizes the app.
 */
export let githubApi: Got;

/**
 * OAuth service for GitHub API.
 */
export const githubOauthService = OAuthService.github({
  personalAccessToken: githubPersonalAccessToken,
  scope: githubOauthScope,
  onAuthorize: async ({ token, type }) => {
    githubApi = got.extend({
      prefixUrl: "https://api.github.com",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `${type === "personal" ? "Token" : "Bearer"} ${token}`,
        "X-GitHub-Api-version": "2022-11-28",
      },
    });
  },
});

/**
 * Creates a GitHub API client with the user's personal access token.
 */
export const withGithubClient = withAccessToken(githubOauthService);

/**
 * Retrieves the list of all extensions from the Raycast repository.
 * @returns A promise that resolves to an array of all extensions.
 */
export const getAllExtensions = async () => {
  const url = "https://raw.githubusercontent.com/raycast/extensions/refs/heads/main/.github/extensionName2Folder.json";
  const json = await got(url).json<Record<string, string>>();
  const extensions = Object.entries(json)
    .map(([name, folder]) => ({ name, folder }))
    .sort((a, b) => a.folder.localeCompare(b.folder));
  return extensions;
};

/**
 * Retrieves the full name of the user's forked repository.
 * @permissions `repo`
 * @remarks If the repository does not exist, it will create a new forked repository. Otherwise, it will return the existing repository full name.
 * @returns The full name of the user's forked repository. The format is `username/repository`.
 * @see {@link https://docs.github.com/en/rest/repos/forks?apiVersion=2022-11-28#create-a-fork|Create a fork}
 */
export const getForkedRepository = async () => {
  const response = await githubApi
    .post("repos/raycast/extensions/forks", {
      json: {
        name: "raycast-extensions",
        default_branch_only: true,
      },
    })
    .json<{ full_name: string }>();
  return response.full_name;
};

/**
 * Syncs the forked repository with the upstream repository on GitHub.
 * @permissions `workflow`
 * @returns A promise that resolves to the message from the GitHub API response.
 * @see {@link https://docs.github.com/en/rest/branches/branches?apiVersion=2022-11-28#sync-a-fork-branch-with-the-upstream-repository|Sync a fork branch with the upstream repository}
 */
export const syncFork = async () => {
  const forkedRepository = await getForkedRepository();
  const response = await githubApi
    .post(`repos/${forkedRepository}/merge-upstream`, {
      json: {
        branch: "main",
      },
    })
    .json<{ message: string }>();
  return response.message;
};

/**
 * Compares two commits in the user's forked repository.
 * @permissions `repo`
 * @returns Commits behind count.
 * @see {@link https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#compare-two-commits|Compare two commits}
 */
export const compareTwoCommits = async (forkedRepository: string) => {
  const [forkUser] = forkedRepository.split("/");
  const response = await githubApi
    .get(`repos/raycast/extensions/compare/raycast:main...${forkUser}:main`)
    .json<{ behind_by: number }>();
  return response.behind_by;
};
