import gitUrlParse from 'git-url-parse'
import { cleanGitUrl } from './cleanGitUrl'

interface ParseRepoUrlResponse {
  owner: string | null | undefined
  name: string | null | undefined
  type?: 'github' | 'gitlab'
  repoUrl?: string
}

export const parseRepoUrl = (repoUrl?: string): ParseRepoUrlResponse => {
  const invalidUrl = {
    owner: null,
    name: null,
    type: undefined,
    repoUrl: undefined,
  }
  if (!repoUrl) return invalidUrl

  try {
    try {
      const url = new URL(repoUrl)
      url.protocol = 'https:'
      repoUrl = url.toString()
    } catch {
      // `get-url-parse` doesn't support some protocols like `git+https`.
      // So we force replaced the protocol to `https:`.
    }
    const parsedUrl = gitUrlParse(repoUrl)
    const cleanedUrl = cleanGitUrl(parsedUrl.toString('https'))
    const isGithubRepo = cleanedUrl.includes('github.com')
    const isGitlabRepo = cleanedUrl.includes('gitlab.com')
    const owner = parsedUrl.owner
    const name = parsedUrl.name
    const type = isGithubRepo ? 'github' : isGitlabRepo ? 'gitlab' : undefined

    return {
      owner,
      name,
      type,
      repoUrl: cleanedUrl,
    }
  } catch {
    return invalidUrl
  }
}
