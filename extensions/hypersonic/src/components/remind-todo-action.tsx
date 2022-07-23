import { Action, ActionPanel, Icon } from '@raycast/api'
import { Todo } from '@/types/todo'

type SetDateActionProps = {
  todo: Todo
  onSetDate: (todo: Todo, dateValue: string | null, name: string) => void
  selectTask?: (todo: Todo) => void
}

const today = new Date()
const t2 = new Date(today)
t2.setDate(t2.getDate() + 1)
const t3 = new Date(t2)
t3.setDate(t3.getDate() + 1)
const t4 = new Date(t3)
t4.setDate(t4.getDate() + 5)
const nextWeek = getNextMondayFromToday()

function getNextMondayFromToday() {
  const today = new Date()
  const day = today.getDay()
  // Sunday is 0 so we set it as 7
  const dayWithoutZero = day === 0 ? 7 : day
  const daysTillNextMonday = 8 - dayWithoutZero
  const date = new Date(today)
  date.setDate(date.getDate() + daysTillNextMonday)
  return date
}

const dates = [
  { name: 'Tomorrow', value: t2 },
  {
    name: new Intl.DateTimeFormat('en-En', {
      weekday: 'long',
    }).format(t3),
    value: t3,
  },
  {
    name: 'Next Week',
    value: nextWeek,
  },
]

export function RemindAction({
  todo,
  onSetDate,
  selectTask,
}: SetDateActionProps) {
  const handleSubmitDate = (date: typeof dates[number]) => {
    const value = date.value.toISOString().split('T')[0]
    onSetDate(todo, value, date.name)
  }

  return (
    <ActionPanel.Submenu title="Remind Me" icon={Icon.Calendar}>
      {dates.map((date) => (
        <Action
          key={date.name}
          title={date.name}
          onAction={() => handleSubmitDate(date)}
        />
      ))}
      {selectTask && (
        <Action title="Set a specific time" onAction={() => selectTask(todo)} />
      )}
    </ActionPanel.Submenu>
  )
}
