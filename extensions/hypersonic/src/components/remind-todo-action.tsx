import { Action, ActionPanel, Icon } from '@raycast/api'
import { Todo } from '@/types/todo'
import { useState } from 'react'
import * as chrono from 'chrono-node'
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
    name: new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
    }).format(t3),
    value: t3,
  },
  {
    name: 'Next Week',
    value: nextWeek,
  },
]

export function RemindAction({ todo, onSetDate }: SetDateActionProps) {
  const [value, setValue] = useState('')
  const [date, setDate] = useState<Date | null>(null)

  const handleSubmitCustomDate = () => {
    if (date) {
      const value = toISOStringWithTimezone(date)
      const name = format(date, "EEEE d MMMM yyyy 'at' HH:mm")
      onSetDate(todo, value, name)
      setValue('')
      setDate(null)
    }
  }

  const handleSubmitDate = (date: typeof dates[number]) => {
    const value = toISOStringWithTimezone(date.value)
    onSetDate(todo, value, date.name)
  }

  const handleOnChangeText = (text: string) => {
    const dateMatch = chrono.parse(text)
    if (dateMatch.length > 0) {
      const b = dateMatch[0].start.date()
      const value = format(b, "EEEE d MMMM yyyy 'at' HH:mm")
      setValue(value)
      setDate(b)
    } else if (text.length === 0) {
      setValue('')
      setDate(null)
    }
  }

  return (
    <ActionPanel.Submenu
      title="Add Due Date"
      icon={Icon.Calendar}
      shortcut={{ modifiers: ['cmd'], key: 'd' }}
      onSearchTextChange={handleOnChangeText}
      filtering={false}
    >
      {dates.map((v) => (
        <Action
          key={v.name}
          title={v.name}
          onAction={() => handleSubmitDate(v)}
        />
      ))}
      {value ? (
        <Action title={value} onAction={handleSubmitCustomDate} autoFocus />
      ) : null}
    </ActionPanel.Submenu>
  )
}
