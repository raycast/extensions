export interface NpmSearchFetchResponse {
  objects: NpmObject[]
  total: number
  time: string
}

export interface NpmObject {
  package: Package
  score: Score
  searchScore: number
  flags?: Flags
}

export interface Package {
  name: string
  scope: string
  version: string
  description: string
  date: string
  links: Links
  publisher: Publisher
  maintainers: Maintainer[]
  keywords?: string[]
  author?: Author
}

export interface Links {
  npm: string
  homepage?: string
  repository?: string
  bugs?: string
}

export interface Publisher {
  username: string
  email: string
}

export interface Maintainer {
  username: string
  email: string
}

export interface Author {
  name: string
  url?: string
  email?: string
  username?: string
}

export interface Score {
  final: number
  detail: Detail
}

export interface Detail {
  quality: number
  popularity: number
  maintenance: number
}

export interface Flags {
  unstable: boolean
}
