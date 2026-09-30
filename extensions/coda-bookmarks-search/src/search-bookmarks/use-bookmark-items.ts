import { useEffect, useMemo, useState } from 'react'
import CodaApi from './coda-api'
import CodaCache from './coda-cache'
import getPreferences from './get-preferences'
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

  const { apiToken, docId, tableId } = getPreferences()

  const cache = useMemo(() => {
    return new CodaCache(docId, tableId)
  }, [docId, tableId])

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
          tableId,
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
  }, [apiToken, cache, docId, hasLoadedFromCache, onError, tableId])

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
  tableId,
}: {
  apiToken: string
  docId: string
  tableId: string
}) {
  const coda = new CodaApi(apiToken)

  const items = await coda.fetchAllItems((params) => {
    return coda.getTableRows(docId, tableId, {
      limit: 100,
      sortBy: 'natural',
      useColumnNames: true,
      ...params,
    })
  })

  return items as ApiItem[]
}
