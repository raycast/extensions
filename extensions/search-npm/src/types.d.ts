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
