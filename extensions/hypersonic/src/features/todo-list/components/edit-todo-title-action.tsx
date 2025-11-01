import { Action, Icon, Form, ActionPanel, useNavigation } from '@raycast/api'
import { useState } from 'react'
import { Todo } from '@/types/todo'

type EditTodoTitleFormProps = {
  todo: Todo
  onUpdateTitle: (todo: Todo, newTitle: string) => Promise<void>
}

function EditTodoTitleForm({ todo, onUpdateTitle }: EditTodoTitleFormProps) {
  const [title, setTitle] = useState(todo.title)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { pop } = useNavigation()

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      await onUpdateTitle(todo, title)
      pop()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
      />
    </Form>
  )
}

type EditTodoTitleActionProps = {
  todo: Todo
  onUpdateTitle: (todo: Todo, newTitle: string) => Promise<void>
}

export function EditTodoTitleAction({
  todo,
  onUpdateTitle,
}: EditTodoTitleActionProps) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit Title..."
      target={<EditTodoTitleForm todo={todo} onUpdateTitle={onUpdateTitle} />}
      shortcut={{ modifiers: ['cmd'], key: 'r' }}
    />
  )
}
