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
      return
    }

    // Full day event
    if (Action.PickDate.isFullDay(date)) {
      const dateYear = date.getFullYear()
      const dateMonth = date.getMonth() + 1
      const dateDate = date.getDate()
      const value = `${dateYear}-${String(dateMonth).padStart(2, '0')}-${String(
        dateDate
      ).padStart(2, '0')}`
      onSetDate(todo, value, value)
      return
    }

    // Event with a specific time
    const value = toISOStringWithTimezone(date)
    // const name = format(date, "EEEE d MMMM yyyy 'at' HH:mm")
    onSetDate(todo, value, value)
  }

  return (
    <Action.PickDate
      title="Add Due Date…"
      shortcut={{ modifiers: ['cmd'], key: 'd' }}
      onChange={handleSubmitCustomDate}
    />
  )
}
