import { Cache } from '@raycast/api'

export const StoreKeys = {
  StarPipeline: 'StarPipeline'
} as const
type ValueOf<T> = T[keyof T]
type StoreValue = ValueOf<typeof StoreKeys>

const cache = new Cache()

export function getItem(key: StoreValue) {
  const data = cache.get(key)
  return data ? JSON.parse(data) : data
}

export function setItem(key: StoreValue, value: any) {
  return cache.set(key, value ? JSON.stringify(value) : '')
}

export function removeCache(key: StoreValue) {
  return cache.remove(key)
}

export function clearCache() {
  return cache.clear()
}
