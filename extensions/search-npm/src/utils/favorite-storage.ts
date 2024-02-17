import { LocalStorage } from '@raycast/api'
import dedupe from 'dedupe'
import type { Package } from '../model/npmResponse.model'

const LOCAL_STORAGE_KEY = 'npm-faves'

export const getFavorites = async (): Promise<Package[]> => {
  const favesFromStorage = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY)
  const faves: Package[] = JSON.parse(favesFromStorage ?? '[]')
  const favesWithoutDuplicates = dedupe(faves)
  return favesWithoutDuplicates
}

export const addFavorite = async (item: Package) => {
  const faves = await getFavorites()
  const favesWithNewItem = [item, ...faves]
  const updatedFavesList = [...new Set(favesWithNewItem)]

  await LocalStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(updatedFavesList),
  )
  return await getFavorites()
}

const removeMatchingItemFromArray = (
  arr: Package[],
  item: Package,
): Package[] => {
  let i = 0
  while (i < arr.length) {
    if (arr[i].name === item.name) {
      arr.splice(i, 1)
    } else {
      ++i
    }
  }
  return arr
}
export const removeItemFromFavorites = async (item: Package) => {
  const faves = await getFavorites()
  const updatedFavesList = removeMatchingItemFromArray(faves, item)
  await LocalStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(updatedFavesList),
  )
  return await getFavorites()
}

export const removeAllItemsFromFavorites = async () => {
  await LocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]))
  return await getFavorites()
}
