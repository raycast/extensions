import { Action, Color, Icon } from '@raycast/api'
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
      icon={{
        source: 'completed.svg',
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
