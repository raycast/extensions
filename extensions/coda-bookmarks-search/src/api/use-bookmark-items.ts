import { useEffect, useMemo, useState } from 'react'
import Cache from './cache'
import CodaApi from './coda-api'
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

  const apiToken = '4c0bda5f-59ac-4983-8b53-88297c47b236'
  const docId = 'GwzNLdiC1g'
  const tableName = 'Bookmarks'

  const cache = useMemo(() => {
    return new Cache(docId, tableName)
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
  }, [apiItems, cache, docId, onError, tableName])

  return {
    isLoading: !hasLoadedFromCache || isFetching,
    isFetching,
    items: apiItems.map((apiItem) => {
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
