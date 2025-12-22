/**
 * Caching utilities for improving performance
 */

import type { KittyPane, KittyPlatformWindow } from '../types'

interface TabColorInfo {
  [tabId: number]: string
}

interface CacheEntry<T> {
  data: T
  timestamp: number
}

class KittyCache {
  private instances: CacheEntry<KittyPlatformWindow[]> | null = null
  private tabs: CacheEntry<KittyPane[]> | null = null
  private tabColors: TabColorInfo = {}
  private readonly DEFAULT_DURATION = 1000 // 1 second

  setInstances(instances: KittyPlatformWindow[]) {
    this.instances = {
      data: instances,
      timestamp: Date.now(),
    }
  }

  getInstances(): KittyPlatformWindow[] | null {
    if (!this.instances) return null

    const age = Date.now() - this.instances.timestamp
    if (age > this.DEFAULT_DURATION) {
      this.instances = null
      return null
    }

    return this.instances.data
  }

  setTabs(tabs: KittyPane[]) {
    this.tabs = {
      data: tabs,
      timestamp: Date.now(),
    }
  }

  getTabs(): KittyPane[] | null {
    if (!this.tabs) return null

    const age = Date.now() - this.tabs.timestamp
    if (age > this.DEFAULT_DURATION) {
      this.tabs = null
      return null
    }

    return this.tabs.data
  }

  clear() {
    this.instances = null
    this.tabs = null
  }

  clearInstances() {
    this.instances = null
  }

  clearTabs() {
    this.tabs = null
  }

  setTabColor(tabId: number, color: string) {
    this.tabColors[tabId] = color
  }

  getTabColor(tabId: number): string | undefined {
    return this.tabColors[tabId]
  }

  removeTabColor(tabId: number) {
    delete this.tabColors[tabId]
  }

  clearAllColors() {
    this.tabColors = {}
  }
}

export const kittyCache = new KittyCache()

/**
 * Cache decorator for async functions
 */
export function withCache<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  cache: CacheEntry<R> | null,
  setCache: (data: R, duration?: number) => void,
  duration: number = 1000
) {
  return async (...args: T): Promise<R> => {
    // Check cache first
    if (cache) {
      const age = Date.now() - cache.timestamp
      if (age <= duration) {
        return cache.data
      }
    }

    // Execute function and cache result
    const result = await fn(...args)
    setCache(result, duration)
    return result
  }
}
