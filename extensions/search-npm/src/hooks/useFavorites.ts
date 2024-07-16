import { useCachedState } from '@raycast/utils'
import { useEffect } from 'react'
import type { Package } from '../model/npmResponse.model'
import { getFavorites } from '../utils/favorite-storage'

export const useFavorites = (): [Package[], () => Promise<void>] => {
  const [favorites, setFavorites] = useCachedState<Package[]>('favorites', [])

  const fetchFavorites = async () => {
    const favoriteItems = await getFavorites()
    setFavorites(favoriteItems)
  }

  useEffect(() => {
    fetchFavorites()
  }, [])

  return [favorites, fetchFavorites]
}
