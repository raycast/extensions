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
      icon={{ source: Icon.Trash }}
      title={'Delete'}
      style={Action.Style.Destructive}
      onAction={() => onDelete(todo.id)}
      shortcut={{ modifiers: ['cmd'], key: 'delete' }}
    />
  )
}
