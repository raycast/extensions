export type Article = {
  id: string
  title: string
  url: string
  slug: string
  author: string
  isArchived: boolean
  labels: {
    id: string
    name: string
    color: string
  }[]
}

export type SearchType = { id: string; name: string; value: string }

export type User = {
  id: string
  name: string
  isFullUser: string
  profile: {
    id: string
    username: string
    pictureUrl: string
    bio: string
  }
}
