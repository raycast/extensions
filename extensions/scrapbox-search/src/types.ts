export type Page = {
  id: string
  title: string
  lines: string[]
}

export type SearchResult = {
  pages: Page[]
}

export type SearchArguements = {
  searchQuery?: string
}

export type Preferences = {
  projectName: string
  token: string
  defaultPage?: string
}
