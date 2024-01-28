import * as React from 'react'
import { showHUD } from '@raycast/api'
import { useCachedState } from '@raycast/utils'
import { supabase } from './supabase'
import { useFetchSearchItems } from './utils/fetchItems'
import { BaseBookmark } from './types'
import { useState } from 'react'

export function useSearch(searchTerm: string) {
  const [search, setSearch] = useState<BaseBookmark[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  React.useEffect(() => {
    const searchBookmarks = async () => {
      console.log(`🚀 ~ searchBookmarks`)
      setIsLoading(true)
      const userRes = await supabase.auth.getUser()

      if (!userRes.data.user) {
        setIsLoading(false)
        return
      }

      const { data, error } = await useFetchSearchItems(searchTerm)

      if (error) {
        showHUD(error.message)
        setIsLoading(false)
        return
      }

      if (data) {
        // @ts-expect-error - types don't match
        setSearch(data)
        setIsLoading(false)
      }
    }

    if (searchTerm) {
      searchBookmarks()
    }
  }, [searchTerm])

  return { bookmarks: search, isLoading }
}
