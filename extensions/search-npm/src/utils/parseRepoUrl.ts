import parseGithubRepoUrl from 'parse-github-url'
import parseGitlabRepoUrl from 'gitlab-url-parse'
import { cleanGitUrl } from './cleanGitUrl'

interface ParseRepoUrlResponse {
  owner: string | null | undefined
  name: string | null | undefined
  type?: 'github' | 'gitlab'
  repoUrl?: string
}

export const parseRepoUrl = (repoUrl?: string): ParseRepoUrlResponse => {
  if (!repoUrl) {
    return {
      owner: null,
      name: null,
      type: undefined,
      repoUrl: undefined,
    }
  }

  const cleanedUrl = cleanGitUrl(repoUrl)
  const isGithubRepo = cleanedUrl.includes('github.com')
  const isGitlabRepo = cleanedUrl.includes('gitlab.com')

  if (isGithubRepo) {
    const parsedRepo = parseGithubRepoUrl(repoUrl)
    return {
      owner: parsedRepo?.owner,
      name: parsedRepo?.name,
      type: 'github',
      repoUrl: cleanedUrl,
    }
  } else if (isGitlabRepo) {
    const parsedRepo = parseGitlabRepoUrl(repoUrl)
    return {
      owner: parsedRepo.user,
      name: parsedRepo.project,
      type: 'gitlab',
      repoUrl: cleanedUrl,
    }
  }

  return {
    owner: null,
    name: null,
    type: undefined,
    repoUrl: cleanedUrl,
  }
}
