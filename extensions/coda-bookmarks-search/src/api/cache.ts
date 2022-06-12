import { LocalStorage } from '@raycast/api'
import { ApiItem } from './translate-to-bookmark-item'

const VERSION = 'v1'

export default class Cache {
  key: string

  constructor(docId: string, tableName: string) {
    this.key = `${VERSION}-${docId}-${tableName}`
  }

  async loadBookmarkItems() {
    const jsonStr = await LocalStorage.getItem<string>(this.key)

    try {
      const data = JSON.parse(jsonStr || '') || null

      return data?.items || []
    } catch (err) {
      return []
    }
  }

  async saveBookmarkItems(items: ApiItem[]) {
    const jsonStr = JSON.stringify({ items })

    await LocalStorage.setItem(this.key, jsonStr)

    return true
  }
}
