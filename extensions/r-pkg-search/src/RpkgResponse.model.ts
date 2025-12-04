import { ParseRepoUrlResponse } from './utils/parseRepoUrl'
export type RpkgFetchResponse = RpkgResultModel[]

export interface RpkgResultModel {
  package: Package
  searchScore: number
  highlight: string
}

export interface Package {
  name: string
  authors: string[]
  version: string
  title: string
  description: string
  date: string
  license: string
  downloads: number
  depends: string[]
  imports: string[]
  suggests: string[]
  systemRequirements: string[]
  revdeps: number
  links: Links
  repo: ParseRepoUrlResponse
}

export interface Links {
  url: string[]
  bugs: string | null
  repo: string | null
}
