import * as React from 'react'
import { showHUD } from '@raycast/api'
import { useCachedState } from '@raycast/utils'
import { supabase } from './supabase'
import { useFetchRecentItems } from './utils/fetchItems'
import { BaseBookmark } from './types'
import { useState } from 'react'

export function useRecents() {
  const [recents, setRecents] = useCachedState<BaseBookmark[]>('recents', [])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  React.useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      const userRes = await supabase.auth.getUser()

      if (!userRes.data.user) {
        setIsLoading(false)
        return
      }

      const { data, error } = await useFetchRecentItems()

      if (error) {
        showHUD(error.message)
        setIsLoading(false)
        return
      }

      if (data) {
        // @ts-expect-error - types don't match
        setRecents(data)
        setIsLoading(false)
      }
    })()
  }, [])

  return { bookmarks: recents, isLoading }
}
