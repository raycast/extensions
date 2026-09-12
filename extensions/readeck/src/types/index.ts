export type SearchType = {
  id: string
  name: string
  value: string
}

export const searchTypes: SearchType[] = [
  { id: '1', name: 'All', value: 'all' },
  { id: '2', name: 'Unread', value: 'unread' },
  { id: '3', name: 'Archived', value: 'archived' },
  { id: '4', name: 'Favorite', value: 'favorite' },
]
