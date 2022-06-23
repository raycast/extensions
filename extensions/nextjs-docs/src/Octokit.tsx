import { Octokit } from "@octokit/core";
import { getPreferenceValues } from "@raycast/api";

const GithubOcto = Octokit.defaults({});

export default GithubOcto;
