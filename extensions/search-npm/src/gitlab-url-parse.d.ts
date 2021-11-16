declare module 'gitlab-url-parse' {
  export interface ParseGitlabUrl {
    user: string
    project: string
  }
  const parse: (repoUrl: string) => ParseGitlabUrl
  export default parse
}
