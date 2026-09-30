export interface Link {
  id: number
  title: string
  type: string
  description: string
  href: string
}

export interface SearchResponse {
  response: Link[]
}

export interface AddFormValues {
  url: string
  title: string
  labels: string
}
