export interface RepoResponse {
  repo: {
    id: number
    name: string
    repo: string
    description: string
    createdAt: string
    updatedAt: string
    pushedAt: string
    stars: number
    watchers: number
    forks: number
    defaultBranch: string
  }
}
