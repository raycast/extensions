import { Tag } from '@/types/tag'
import { Color } from '@raycast/api'
import { notionColorToTintColor } from './notion-color-to-tint-color'

export const mapPageTag = (tag: any): Tag => {
  return {
    ...tag,
    color: tag.color ? notionColorToTintColor(tag.color) : Color.Brown,
  }
}
