import { Action } from '@raycast/api'
import { Todo } from '@/types/todo'
import { toISOStringWithTimezone } from '@/features/todo-list/utils/to-iso-string-with-time-zone'
import { format } from 'date-fns'

type SetDateActionProps = {
  todo: Todo
  onSetDate: (
    todo: Todo,
    dateValue: string | null,
    name: string
  ) => Promise<void>
  selectTask?: (todo: Todo) => void
}

export function RemindAction({ todo, onSetDate }: SetDateActionProps) {
  const handleSubmitCustomDate = (date: Date | null) => {
    if (!date) {
      onSetDate(todo, null, 'No date')
    } else {
      const value = toISOStringWithTimezone(date)
      const name = format(date, "EEEE d MMMM yyyy 'at' HH:mm")
      onSetDate(todo, value, name)
    }
  }

  return (
    <Action.PickDate
      title="Add Due Date…"
      shortcut={{ modifiers: ['cmd'], key: 'd' }}
      onChange={handleSubmitCustomDate}
    />
  )
}
