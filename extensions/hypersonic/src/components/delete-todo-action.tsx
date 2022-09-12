import { Action, Icon } from '@raycast/api'
import { Todo } from '@/types/todo'

export function DeleteTodoAction({
  todo,
  onDelete,
}: {
  todo: Todo
  onDelete: (todoId: string) => void
}) {
  return (
    <Action
      icon={Icon.Trash}
      title={'Delete'}
      onAction={() => onDelete(todo.id)}
      shortcut={{ modifiers: ['cmd'], key: 'delete' }}
    />
  )
}
