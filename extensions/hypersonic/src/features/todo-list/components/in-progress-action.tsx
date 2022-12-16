import { Action } from '@raycast/api'
import { Todo } from '@/types/todo'
import { getProgressIcon } from '@raycast/utils'

export function InProgressAction({
  todo,
  inProgress,
}: {
  todo: Todo
  inProgress: (todo: Todo) => void
}) {
  return (
    <Action
      icon={{
        source: {
          light: getProgressIcon(0.5, '#000000'),
          dark: getProgressIcon(0.5, '#ffffff'),
        },
      }}
      title={'Mark as In Progress'}
      onAction={() => inProgress(todo)}
    />
  )
}
