import { Action, Color } from '@raycast/api'
import { Todo } from '@/types/todo'
import { DEFAULT_STATUS_ICONS } from '@/utils/statuses'

export function CompleteTodoAction({
  todo,
  onComplete,
}: {
  todo: Todo
  onComplete: (todo: Todo) => void
}) {
  return (
    <Action
      icon={{
        source: DEFAULT_STATUS_ICONS.completed,
        tintColor: {
          light: Color.SecondaryText,
          dark: Color.PrimaryText,
        },
      }}
      title={'Mark as Completed'}
      onAction={() => onComplete(todo)}
    />
  )
}
