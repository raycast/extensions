import { TransparentEmpty } from '@/features/todo-list/components/transparent-empty'
import { List } from '@raycast/api'

export function Transparent() {
  return (
    <List>
      <TransparentEmpty />
    </List>
  )
}
