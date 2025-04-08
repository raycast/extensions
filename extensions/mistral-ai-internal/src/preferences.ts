import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  githubToken: string;
  slackOauthToken?: string;
  dashboardRepoPath: string;
  mistralApiKey: string;
}

const REPO = "dashboard";
const OWNER = "mistralai";

export const getPreferences = () => {
  const preferences = getPreferenceValues<Preferences>();
  const token = preferences.githubToken;
  const slackOauthToken = preferences.slackOauthToken;

  return { githubToken: token, owner: OWNER, repo: REPO, slackOauthToken };
};
