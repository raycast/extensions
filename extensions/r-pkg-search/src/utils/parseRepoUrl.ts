import parseGithubUrl from 'parse-github-url'

export interface ParseRepoUrlResponse {
  owner: string | null
  name: string | null
  type?: 'github'
}

export const parseRepoUrl = (repoUrl?: string): ParseRepoUrlResponse => {
  if (!repoUrl || !repoUrl.includes('github.com')) {
    return {
      owner: null,
      name: null,
      type: undefined,
    }
  }

  const Result = parseGithubUrl(repoUrl)

  return {
    owner: Result?.owner || null,
    name: Result?.name || null,
    type: 'github',
  }
}
