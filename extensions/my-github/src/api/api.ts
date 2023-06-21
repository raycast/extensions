import { Octokit } from "@octokit/rest"
import { getPreferenceValues } from "@raycast/api"

const { personalAccessToken } = getPreferenceValues()

const getOctokit = () => {
  return new Octokit({
    auth: personalAccessToken,
  })
}

export const githubClient = getOctokit()
