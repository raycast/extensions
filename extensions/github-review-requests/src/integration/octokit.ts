import { getPreferenceValues } from "@raycast/api";
import { Octokit } from "octokit";

export const githubAPIToken = getPreferenceValues()["token"];
const octokit = new Octokit({ auth: githubAPIToken });

export default octokit;
