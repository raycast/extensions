import { supabase } from '../supabase'
import type { Bookmark, CollectionType, MetaTag, MetaType } from '../types'

export const useFetchSearchItems = async (
  searchTerm: string = '',
  tag?: string,
) => {
  let query = supabase
    .from('bookmarks')
    .select('*', { count: 'exact' })
    .or(
      `title.ilike.*${searchTerm}*,url.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*,note.ilike.*${searchTerm}*,tags.cs.{${searchTerm}}`,
    )
    .match({ status: 'active' })
    .order('created_at', { ascending: false })

  if (tag) {
    if (tag === 'Untagged') {
      query = query.eq('tags', '{}')
    } else {
      query = query.filter('tags', 'cs', `{${tag}}`)
    }
  }

  return await query.returns<Bookmark[]>()
}

export const useFetchRecentItems = async (tag?: string, limit: number = 60) => {
  let query = supabase
    .from('bookmarks')
    .select('*', { count: 'exact' })
    .limit(limit)
    .match({ status: 'active' })
    .order('created_at', { ascending: false })

  if (tag) {
    if (tag === 'Untagged') {
      query = query.eq('tags', '{}')
    } else {
      query = query.filter('tags', 'cs', `{${tag}}`)
    }
  }

  return await query.returns<Bookmark[]>()
}
export const useFetchMeta = async () => {
  const types = await supabase
    .from('types_count')
    .select('*')
    .returns<MetaType[]>()
  const tags = await supabase
    .from('tags_count')
    .select('*')
    .returns<MetaTag[]>()
  const collections = await supabase
    .from('collection_tags_view')
    .select('*')
    .returns<CollectionType[]>()

  return {
    types: types.data || [],
    tags: tags.data || [],
    collections: collections.data || [],
  }
}
