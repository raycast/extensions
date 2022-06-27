import { Action, Icon } from '@raycast/api'
import { Todo } from '@/types/todo'

export function CompleteTodoAction({
  todo,
  onComplete,
}: {
  todo: Todo
  onComplete: (todo: Todo) => void
}) {
  return (
    <Action
      icon={Icon.Checkmark}
      title={'Mark as Done'}
      onAction={() => onComplete(todo)}
    />
  )
}
