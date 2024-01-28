export type ApiResponse = {
  offset: number
  limit: number
  count: number
  _links: {
    next: string | null
    prev: string | null
  }
  data: Bookmark[]
}

export interface Bookmark {
  click_count: number
  created_at: string
  description: string | null
  feed: string | null
  id: string
  image: string | null
  modified_at: string
  note: string | null
  star: boolean
  status: BookmarkStatus
  tags: string[] | null
  title: string | null
  type: BookmarkType
  url: string | null
  user: string | null

  tweet?: {
    text: string
    username: string
    url: string
  }
}

export type BookmarkType =
  | 'link'
  | 'article'
  | 'video'
  | 'audio'
  | 'recipe'
  | 'image'
  | 'document'
  | 'product'
  | 'game'
  | 'note'
  | 'event'
  | 'file'

export type BookmarkStatus =
  | 'link'
  | 'video'
  | 'audio'
  | 'recipe'
  | 'image'
  | 'document'
  | 'article'
  | 'game'
  | 'book'
  | 'event'
  | 'product'
  | 'note'
  | 'file'
