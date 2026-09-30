import { Icon } from '@raycast/api'
import type { BookmarkType } from '../types'

export const typeToIcon = (type: BookmarkType) => {
  switch (type) {
    case 'article':
      return Icon.Document
    case 'video':
      return Icon.Video
    case 'audio':
      return Icon.Music
    case 'image':
      return Icon.Image
    case 'recipe':
      return Icon.Leaf
    case 'document':
      return Icon.Document
    case 'product':
      return Icon.Car
    case 'game':
      return Icon.GameController
    case 'link':
      return Icon.Link
    case 'note':
      return Icon.Snippets
    case 'event':
      return Icon.Clock
    case 'place':
      return Icon.Pin
    case 'book':
      return Icon.Book
    default:
      return Icon.Bookmark
  }
}
