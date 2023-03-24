export interface GrafanaPreference {
  GrafanaPAT: string
  GrafanaBaseUrl: string
}

export type GrafanaSimpleFolders = GrafanaSimpleFolder[]
export interface GrafanaSimpleFolder {
  id: string
  uid: string
  title: string
}

export type GrafanaDashboards = GrafanaDashboard[]

export interface GrafanaDashboard {
  id: number
  uid: string
  title: string
  uri: string
  url: string
  slug: string
  type: string
  tags: string[]
  isStarred: boolean
  folderId: number
  folderUid: string
  folderTitle: string
  folderUrl: string
}
