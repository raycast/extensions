import { LocalStorage } from '@raycast/api'
import dedupe from 'dedupe'
import type { PyPIPackage } from '../model/pypiSearch.model'

const LOCAL_STORAGE_KEY = 'pypi-faves'

export const getFavorites = async (): Promise<PyPIPackage[]> => {
  const favesFromStorage = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY)
  const faves: PyPIPackage[] = JSON.parse(favesFromStorage ?? '[]')
  const favesWithoutDuplicates = dedupe(faves)
  return favesWithoutDuplicates
}

export const addFavorite = async (item: PyPIPackage) => {
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
  arr: PyPIPackage[],
  item: PyPIPackage,
): PyPIPackage[] => {
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
export const removeItemFromFavorites = async (item: PyPIPackage) => {
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
