import { Todo } from '@/types/todo'
import { Action, ActionPanel, Form } from '@raycast/api'

export function DateReminder({
  taskToEdit,
  setTaskToEdit,
  handleSetDate,
}: {
  taskToEdit: Todo
  setTaskToEdit: (taskToEdit: Todo | null) => void
  handleSetDate: (task: Todo, date: string, name: string) => Promise<void>
}) {
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
