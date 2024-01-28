import { Database } from './supabase-types'

export type BaseBookmark = Database['public']['Tables']['bookmarks']['Row']
export type Bookmark = Omit<BaseBookmark, 'tweet'> & {
  tweet?: {
    text: string
    username: string
    url: string
  }
}
export type BookmarkType = Database['public']['Enums']['type']
export type BookmarkStatus = Database['public']['Enums']['status']
