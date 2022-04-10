import { Octokit } from "@octokit/core";
import { getPreferenceValues } from "@raycast/api";

const { github_personal_access_token } = getPreferenceValues<{ github_personal_access_token?: string }>()

const GithubOcto = Octokit.defaults({
    auth: github_personal_access_token
});

export default GithubOcto