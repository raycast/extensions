import { Action, Icon } from '@raycast/api'
import { Todo } from '@/types/todo'

export function CancelTodoAction({
  todo,
  onCancel,
}: {
  todo: Todo
  onCancel: (todo: Todo) => void
}) {
  return (
    <Action
      icon={Icon.XmarkCircle}
      title={'Mark as Cancelled'}
      onAction={() => onCancel(todo)}
      shortcut={{ modifiers: ['cmd'], key: '0' }}
    />
  )
}
