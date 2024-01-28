import { supabase } from '../supabase'

export const useFetchSearchItems = (searchTerm: string = '') => {
  return supabase
    .from('bookmarks')
    .select('*', { count: 'exact' })
    .or(
      `title.ilike.*${searchTerm}*,url.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*,note.ilike.*${searchTerm}*,tags.cs.{${searchTerm}}`
    )
    .match({ status: 'active' })
    .order('created_at', { ascending: false })
}

export const useFetchRecentItems = () => {
  return supabase
    .from('bookmarks')
    .select('*', { count: 'exact' })
    .limit(60)
    .match({ status: 'active' })
    .order('created_at', { ascending: false })
}
