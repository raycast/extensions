import { List } from '@raycast/api'

export function TransparentEmpty() {
  return (
    <List.EmptyView
      icon={{
        source: 'transparent.png',
      }}
    />
  )
}
