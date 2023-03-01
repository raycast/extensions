import { getPreferenceValues } from "@raycast/api";
import { Octokit } from "octokit";
import { Repository } from "@octokit/webhooks-types";
import hdate from "human-date";

export interface GithubPreferences {
  token: string;
  repositories: string;
}

const preferences = getPreferenceValues<GithubPreferences>();
export const githubClient = new Octokit({ auth: preferences.token });

export function repoFromPrefs(): Repository[] {
  return preferences.repositories
    .split(" ")
    .sort()
    .map((repo) => {
      const ownerAndName = repo.split("/");
      return {
        owner: {
          login: ownerAndName[0],
        },
        name: ownerAndName[1],
      } as Repository;
    });
}

export function duration(date: string) {
  if (date === "") {
    return;
  }
  return hdate.relativeTime(date);
}
