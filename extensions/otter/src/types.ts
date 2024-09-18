import { Database } from './supabase-types'

export type Bookmark = Database['public']['Tables']['bookmarks']['Row']

export type BookmarkType = Database['public']['Enums']['type']
export type BookmarkStatus = Database['public']['Enums']['status']

export interface MetaResponse {
  types: MetaType[]
  tags: MetaTag[]
  collections?: CollectionType[]
}
export type MetaTag = Database['public']['Views']['tags_count']['Row']
export type MetaType = Database['public']['Views']['types_count']['Row']

export type CollectionType =
  Database['public']['Views']['collection_tags_view']['Row']
