export type ANpmFetchResponse = {
  docs: Package[]
}

export interface Package {
  latest: {
    // 包名
    name: string
    // 包描述
    description: string
    // 作者
    author: Maintainer
    // 维护者
    maintainers: Maintainer
    // 仓库地址
    repository: Repository
    // 版本
    version: string,
    // 首页地址：有些仓库不一定有
    homepage?: string
    // last updated
    _cnpmcore_publish_time: string
    // 关键词
    keywords?: string[]
  }
}

export interface Repository {
  url: string
  type: string
}

export interface Maintainer {
  name: string
  email: string
}

declare module 'gitlab-url-parse' {
  export interface ParseGitlabUrl {
    user: string
    project: string
  }
  const parse: (repoUrl: string) => ParseGitlabUrl
  export default parse
}

declare module 'tiny-relative-date' {
  const tinyRelativeDate: (date: Date) => string
  export default tinyRelativeDate
}
