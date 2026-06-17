export interface ApiItem {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface BookmarkItem {
  id: string | number
  name: string
  url: string
}

export default function translateToBookmarkItem(
  apiItem: ApiItem,
): BookmarkItem {
  const { id, values } = apiItem
  const { name, url } = values

  return {
    id,
    name,
    url,
  }
}
