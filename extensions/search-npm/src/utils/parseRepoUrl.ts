import type { Result } from 'parse-github-url'
import parsedGithubRepoUrl from 'parse-github-url'
import type { ParseGitlabUrl } from 'gitlab-url-parse'
import parsedGitlabRepoUrl from 'gitlab-url-parse'

interface ParseRepoUrlResponse {
  owner: string | null | undefined
  name: string | null | undefined
  type?: 'github' | 'gitlab'
}

export const parseRepoUrl = (repoUrl?: string): ParseRepoUrlResponse => {
  if (!repoUrl) {
    return {
      owner: null,
      name: null,
      type: undefined,
    }
  }

  const isGithubRepo = repoUrl.includes('github.com')
  const isGitlabRepo = repoUrl.includes('gitlab.com')
  const parsedRepo = isGithubRepo
    ? parsedGithubRepoUrl(repoUrl)
    : isGitlabRepo
      ? parsedGitlabRepoUrl(repoUrl)
      : null

  return {
    owner: isGithubRepo
      ? (parsedRepo as Result).owner
      : isGitlabRepo
        ? (parsedRepo as ParseGitlabUrl).user
        : null,
    name: isGithubRepo
      ? (parsedRepo as Result).name
      : isGitlabRepo
        ? (parsedRepo as ParseGitlabUrl).project
        : null,
    type: isGithubRepo ? 'github' : isGitlabRepo ? 'gitlab' : undefined,
  }
}
