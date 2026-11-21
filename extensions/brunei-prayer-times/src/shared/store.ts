// specs/raycast/spec.md — device storage for the data port and the district
// choice. Raycast's Cache is synchronous and survives relaunches.
import { Cache } from '@raycast/api'
import type { District } from '../vendor/core.js'
import type { StringStore } from './day.js'

export const LOCAL_STORAGE_KEY = {
  DISTRICT: 'wsb.raycast.district',
} as const

const cache = new Cache()

/** Synchronous Cache exposed as the port's async string store. */
export const localStore: StringStore = {
  getItemSync(key) {
    return cache.get(key) ?? null
  },
  async getItem(key) {
    return cache.get(key)
  },
  async setItem(key, value) {
    cache.set(key, value)
  },
}

/** Persists the district dropdown so the next launch opens on it. */
export function rememberDistrict(district: District): void {
  cache.set(LOCAL_STORAGE_KEY.DISTRICT, district)
}

/** The district chosen in the dropdown on a previous launch, if any. */
export function storedDistrict(): string | null {
  return cache.get(LOCAL_STORAGE_KEY.DISTRICT) ?? null
}
