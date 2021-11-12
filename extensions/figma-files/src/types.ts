export type File = {
  key: string
  last_modified: string
  name: string
  thumbnail_url: string
}

export type Project = {
  id: string
  name: string
}

export type ProjectFiles = {
  files: File[]
  name: string
}

export type TeamProjects = {
  name: string
  projects: Project[]
}
