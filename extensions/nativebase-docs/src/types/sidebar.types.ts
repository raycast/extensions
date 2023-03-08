export interface SidebarResponse {
  sidebar: Sidebar[]
}

export interface Sidebar {
  type?: Type
  title: string
  pages?: SidebarPage[]
  id?: string
}

export interface SidebarPage {
  id?: string
  title: string
  showToc?: boolean
  notVisibleInSidebar?: boolean
  status?: string
  type?: Type
  isCollapsed?: boolean
  pages?: PagePage[]
}

export interface PagePage {
  id: string
  title: string
}

export enum Type {
  Heading = 'heading'
}
