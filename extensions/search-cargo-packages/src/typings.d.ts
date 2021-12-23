/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ICreateRaw {
  badges: any[]
  categories?: any
  created_at: Date
  description: string
  documentation?: any
  downloads: number
  exact_match: boolean
  homepage?: any
  id: string
  keywords?: any
  links: any
  max_stable_version: string
  max_version: string
  name: string
  newest_version: string
  recent_downloads: number
  repository?: any
  updated_at: Date
  versions?: any
}

export interface ICreate {
  name: string
  description: string
  version: string
  numberOfDownloads: number
  installCommand: string
  urlCratesIo: string
  urlRepo: ?string
  urlDocumentation: ?string
}
