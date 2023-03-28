import { LocalStorage } from '@raycast/api'
import dedupe from 'dedupe'
import { Package } from '../npmResponse.model'

const LOCAL_STORAGE_KEY = 'npm-faves'

export const getFaves = async (): Promise<Package[]> => {
  const favesFromStorage = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY)
  const faves: Package[] = JSON.parse(favesFromStorage ?? '[]')
  const favesWithoutDuplicates = dedupe(faves)
  return favesWithoutDuplicates
}

export const addFave = async (item: Package) => {
  const faves = await getFaves()
  const favesWithNewItem = [item, ...faves]
  const updatedFavesList = [...new Set(favesWithNewItem)]

  await LocalStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(updatedFavesList),
  )
  return await getFaves()
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
export const removeItemFromFaves = async (item: Package) => {
  const faves = await getFaves()
  const updatedFavesList = removeMatchingItemFromArray(faves, item)
  await LocalStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(updatedFavesList),
  )
  return await getFaves()
}

export const removeAllItemsFromFaves = async () => {
  await LocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]))
  return await getFaves()
}
