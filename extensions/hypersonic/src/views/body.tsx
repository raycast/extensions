import { useToken } from '@/hooks/use-token'
import { UNAUTHORIZED_TOKEN } from '@/contexts/token-context'

import { ToDoList } from './todo-list'
import { Onboarding } from './onboarding'
import { Transparent } from './transparent'
import { Action, ActionPanel, Form } from '@raycast/api'
import { useState } from 'react'
import { useTodos } from '@/hooks/use-todos'
import { Todo } from '@/types/todo'

export function Body() {
  const { token } = useToken()
  const { handleSetDate } = useTodos()
  const [taskToEdit, setTaskToEdit] = useState<Todo | null>(null)
  if (!token) {
    return <Transparent />
  }

  if (token === UNAUTHORIZED_TOKEN) {
    return <Onboarding />
  }

  if (taskToEdit) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Set Reminder"
              onSubmit={(values) => {
                handleSetDate(
                  taskToEdit,
                  values.date.toISOString(),
                  values.date?.toLocaleDateString('en-En') || 'No Date'
                ).then(() => setTaskToEdit(null))
              }}
            />
          </ActionPanel>
        }
      >
        <Form.DatePicker
          id="date"
          title="Reminder date"
          defaultValue={new Date()}
        />
      </Form>
    )
  }

  return <ToDoList selectTask={setTaskToEdit} />
}
