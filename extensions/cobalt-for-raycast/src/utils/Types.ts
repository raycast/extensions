export type FormValues = {
  url: string
  downloadMode: string
  instance: string
}

export type CobaltError = {
  code: string
  context: {
    service: string
  }
}

export type GitInstance = {
  branch: string
  commit: string
  remote: string
}

export type Instance = {
  id: string
  protocol?: string
  git?: GitInstance
  services?: string[]
  score?: number
  name: string
  api: string
  version?: string
  apiKey?: string
  frontend?: string
}
