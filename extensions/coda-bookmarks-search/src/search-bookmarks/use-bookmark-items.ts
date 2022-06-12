import { useEffect, useMemo, useState } from 'react'
import CodaApi from './coda-api'
import CodaCache from './coda-cache'
import getPreferences from './getPreferences'
import translateToBookmarkItem, { ApiItem } from './translate-to-bookmark-item'

interface UseBookmarkItemsOpts {
  onError?: (err: Error) => void
}

export default function useBookmarkItems({
  onError,
}: UseBookmarkItemsOpts = {}) {
  const [hasLoadedFromCache, setHasLoadedFromCache] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [apiItems, setApiItems] = useState<ApiItem[]>([])

  const { apiToken, docId, tableName } = getPreferences()

  const cache = useMemo(() => {
    return new CodaCache(docId, tableName)
  }, [docId, tableName])

  useEffect(() => {
    async function loadCachedItems() {
      const items = await cache.loadBookmarkItems()

      if (items.length > 0) {
        setApiItems(items)
      }

      setHasLoadedFromCache(true)
    }

    loadCachedItems()
  }, [cache])

  useEffect(() => {
    if (!hasLoadedFromCache) {
      return
    }

    async function fetchItems() {
      setIsFetching(true)

      try {
        const items = await fetchApiItems({
          apiToken,
          docId,
          tableName,
        })

        setApiItems(items)
        setIsFetching(false)

        await cache.saveBookmarkItems(items)
      } catch (err) {
        setIsFetching(false)

        if (onError) {
          onError(err as Error)
        }
      }
    }

    fetchItems()
  }, [apiToken, cache, docId, hasLoadedFromCache, onError, tableName])

  return {
    isLoading: !hasLoadedFromCache || isFetching,
    isFetching,
    bookmarkItems: apiItems.map((apiItem) => {
      return translateToBookmarkItem(apiItem)
    }),
  }
}

async function fetchApiItems({
  apiToken,
  docId,
  tableName,
}: {
  apiToken: string
  docId: string
  tableName: string
}) {
  const coda = new CodaApi(apiToken)

  const items = await coda.fetchAllItems((params) => {
    return coda.getTableRows(docId, tableName, {
      limit: 100,
      sortBy: 'natural',
      useColumnNames: true,
      ...params,
    })
  })

  return items as ApiItem[]
}
