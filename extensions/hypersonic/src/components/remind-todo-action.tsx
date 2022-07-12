import { Action, ActionPanel, Icon } from '@raycast/api'
import { Todo } from '@/types/todo'

type SetDateActionProps = {
  todo: Todo
  onSetDate: (todo: Todo, dateValue: Date | null, name: string) => void
}

const today = new Date()
const t2 = new Date(today)
t2.setDate(t2.getDate() + 1)
const t3 = new Date(t2)
t3.setDate(t3.getDate() + 1)
const t4 = new Date(t3)
t4.setDate(t4.getDate() + 5)
const nextWeek = getNextMondayFromToday()
const onWeekend = getNextSaturdayDayFromToday()

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

function getNextSaturdayDayFromToday() {
  const today = new Date()
  const day = today.getDay()
  const daysTillSaturday = 6 - day
  const daysTillNextSaturday = daysTillSaturday === 0 ? 7 : daysTillSaturday
  const date = new Date(today)
  date.setDate(date.getDate() + daysTillNextSaturday)
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
  {
    name: 'On the Weekend',
    value: onWeekend,
  },
]

export function RemindAction({ todo, onSetDate }: SetDateActionProps) {
  return (
    <ActionPanel.Submenu title="Remind Me" icon={Icon.Calendar}>
      {dates.map((date) => (
        <Action
          key={date.name}
          title={date.name}
          onAction={() => onSetDate(todo, date.value, date.name)}
        />
      ))}
    </ActionPanel.Submenu>
  )
}
