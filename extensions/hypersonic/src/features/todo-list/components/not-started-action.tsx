import { Action } from '@raycast/api'
import { Todo } from '@/types/todo'
import { getProgressIcon } from '@raycast/utils'

export function NotStartedAction({
  todo,
  notStarted,
}: {
  todo: Todo
  notStarted: (todo: Todo) => void
}) {
  return (
    <Action
      icon={{
        source: {
          light: getProgressIcon(0, '#000000'),
          dark: getProgressIcon(0, '#ffffff'),
        },
      }}
      title={'Mark as Not Started'}
      onAction={() => notStarted(todo)}
    />
  )
}
