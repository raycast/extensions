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
  const cache = useMemo(() => {
    return new Cache('GwzNLdiC1g', 'Bookmarks')
  }, [])

  const [isLoading, setIsLoading] = useState(false)
  const [apiItems, setApiItems] = useState<ApiItem[]>([])

  useEffect(() => {
    async function loadCachedItems() {
      const items = await cache.getBookmarkItems()

      if (items.length > 0) {
        setApiItems(items)
      }
    }

    loadCachedItems()
  }, [cache])

  useEffect(() => {
    async function fetchItems() {
      setIsLoading(true)

      try {
        const coda = new CodaApi('4c0bda5f-59ac-4983-8b53-88297c47b236')

        const items = await coda.fetchAllItems(
          (params) => {
            return coda.getTableRows('GwzNLdiC1g', 'Bookmarks', params)
          },
          {
            params: {
              limit: 100,
              sortBy: 'natural',
              useColumnNames: true,
            },
          },
        )

        setApiItems(items)
        setIsLoading(false)

        await cache.saveBookmarkItems(items)
      } catch (err) {
        setIsLoading(false)

        if (onError) {
          onError(err as Error)
        }
      }
    }

    fetchItems()
  }, [cache, onError])

  return {
    isLoading,
    items: apiItems.map((apiItem) => {
      return translateToBookmarkItem(apiItem)
    }),
  }
}
