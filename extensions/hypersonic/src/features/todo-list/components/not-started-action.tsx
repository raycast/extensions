import { Action, Icon } from '@raycast/api'
import { Todo } from '@/types/todo'

export function NotStartedAction({
  todo,
  notStarted,
}: {
  todo: Todo
  notStarted: (todo: Todo) => void
}) {
  return (
    <Action
      icon={Icon.Circle}
      title={'Mark as Not Started'}
      onAction={() => notStarted(todo)}
    />
  )
}
