// specs/raycast/spec.md — today's prayer data, offline first.
// Raycast LocalStorage is the device cache; Supabase refreshes it. MORA is
// never contacted at runtime — it is a monthly, manual import.
import { bruneiNow, type PrayerEntry } from '../vendor/core.js'
import {
  CachedPrayerRepository,
  type PrayerCacheStore,
  type PrayerRepository,
} from '../vendor/data.js'
import { SupabasePrayerSource } from '../vendor/supabase.js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js'

export interface LoadedDay {
  date: string
  entries: PrayerEntry[]
  hijriDate: string
  stale: boolean
}

/** Async string cache over a minimal store; sync read speeds the first paint. */
export interface StringStore {
  getItem(key: string): Promise<string | undefined>
  setItem(key: string, value: string): Promise<void>
  getItemSync?(key: string): string | null
}

export function storeCache(store: StringStore): PrayerCacheStore {
  return {
    async get(key) {
      const value = await store.getItem(key)
      return typeof value === 'string' ? value : null
    },
    async set(key, value) {
      await store.setItem(key, value)
    },
    getSync(key) {
      return store.getItemSync?.(key) ?? null
    },
  }
}

export function repository(cache?: PrayerCacheStore): PrayerRepository {
  const config =
    SUPABASE_URL && SUPABASE_ANON_KEY
      ? { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }
      : null
  return new CachedPrayerRepository({
    source: config
      ? new SupabasePrayerSource(config)
      : {
          async fetchPrayerEntries() {
            throw new Error('Supabase is not configured')
          },
        },
    cache,
  })
}

/** Reads today's base entries (Brunei & Muara); never throws. */
export async function loadDay(
  repo: PrayerRepository,
  force = false,
): Promise<LoadedDay | null> {
  const date = bruneiNow().date
  if (force) await repo.refresh(date, 'bruneiMuara')
  const result = await repo.read(date, 'bruneiMuara')
  if (result.status === 'unavailable') return null
  return {
    date,
    entries: result.entries,
    hijriDate: result.hijriDate,
    stale: result.stale,
  }
}
