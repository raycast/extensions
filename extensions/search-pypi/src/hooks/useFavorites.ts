import { useCachedState } from '@raycast/utils'
import { useEffect } from 'react'
import { getFavorites } from '../utils/favorite-storage'
import type { PyPIPackage } from '../model/pypiSearch.model'

export const useFavorites = (): [PyPIPackage[], () => Promise<void>] => {
  const [favorites, setFavorites] = useCachedState<PyPIPackage[]>(
    'favorites',
    [],
  )

  const fetchFavorites = async () => {
    const favoriteItems = await getFavorites()
    setFavorites(favoriteItems)
  }

  useEffect(() => {
    fetchFavorites()
  }, [])

  return [favorites, fetchFavorites]
}
