import { Repository } from "../types/base";
import parsedGithubRepoUrl from 'parse-github-url'

type ParsedRepoType = {
  owner: string | null
  name: string | null
  type: Exclude<PlatformTypes, 'default'> | null
  url: string | null
}

type PlatformTypes = 'github' | 'gitlab' | 'alibaba-inc' | 'default'

type HostsType = {
  hostname: string
  platform: PlatformTypes
}[]

const hosts: HostsType = [
  {
    hostname: 'github.com',
    platform: 'github'
  },
  {
    hostname: 'gitlab.com',
    platform: 'gitlab'
  },
  {
    hostname: 'alibaba-inc.com',
    platform: 'alibaba-inc'
  }
]

function _parsedAliRepo(url: string): ParsedRepoType {
  const patterns = [
    /^(?:https?:\/\/gitlab\.alibaba-inc\.com\/|git@gitlab\.alibaba-inc\.com:)(.+?)\/(.+?)(?:\.git)?$/,
    /^(?:https?:\/\/code\.alibaba-inc\.com\/|git@code\.alibaba-inc\.com:)(.+?)\/(.+?)(?:\.git)?$/
  ]

  for (const regex of patterns) {
    const match = url.match(regex);

    if (match) {
      return {
        owner: match[1],
        name: match[2],
        type: 'alibaba-inc',
        url: `https://code.alibaba-inc.com/${match[1]}/${match[2]}`,
      };
    }
  }

  return {
    owner: null,
    name: null,
    type: null,
    url: null,
  }
}

function _parsedGitlabRepo(url: string): ParsedRepoType {
  const regex = /^(?:https?:\/\/gitlab\.com\/|git@gitlab\.com:)(.+?)\/(.+?)(?:\.git)?$/
  const match = url.match(regex);

  if (!match) {
    return {
      owner: null,
      name: null,
      type: null,
      url: null,
    }
  }

  return {
    owner: match[1],
    name: match[2],
    type: 'gitlab',
    url: `https://gitlab.com/${match[1]}/${match[2]}`,
  }
}

function _parsedGithubRepo(url: string): ParsedRepoType {
  const parsedRepo = parsedGithubRepoUrl(url)

  if (!parsedRepo) {
    return {
      owner: null,
      name: null,
      type: null,
      url: null,
    }
  }

  return {
    owner: parsedRepo.owner,
    name: parsedRepo.name,
    type: 'github',
    url: `https://github.com/${parsedRepo.owner}/${parsedRepo.name}`,
  }
}

function parsedRepo(repo: Repository): ParsedRepoType {
  const { url: repoUrl } = repo || {}

  if (!repoUrl) {
    return {
      owner: null,
      name: null,
      type: null,
      url: null,
    }
  }

  let platform: PlatformTypes = 'default'

  for (const h of hosts) {
    if (repoUrl.includes(h.hostname)) {
      platform = h.platform
      break
    }
  }

  if (platform === 'default') {
    return {
      owner: null,
      name: null,
      type: null,
      url: null,
    }
  }

  const platformActions: Record<Exclude<PlatformTypes, 'default'>, typeof _parsedGithubRepo> = {
    github: _parsedGithubRepo,
    gitlab: _parsedGitlabRepo,
    'alibaba-inc': _parsedAliRepo,
  }

  const action = platformActions[platform]

  return action(repoUrl)
}

export default parsedRepo