import type { KittyPane } from '../types'

/**
 * Filter and sort tabs by query with enhanced sorting
 * - Active tabs appear first
 * - Alphabetical by title within each group
 */
export const filterAndSortTabs = (tabs: KittyPane[], query: string): KittyPane[] => {
  let filtered = tabs

  // Filter by query
  if (query.trim()) {
    const lowerQuery = query.toLowerCase()
    filtered = tabs.filter(
      tab =>
        tab.title.toLowerCase().includes(lowerQuery) ||
        tab.workingDirectory.toLowerCase().includes(lowerQuery) ||
        tab.foregroundProcessName?.toLowerCase().includes(lowerQuery)
    )
  }

  // Sort: active first, then by title
  return filtered.sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return a.title.localeCompare(b.title)
  })
}
