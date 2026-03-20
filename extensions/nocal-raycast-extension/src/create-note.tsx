import { Action, ActionPanel, Form, popToRoot } from '@raycast/api'
import { useState } from 'react'
import { createNote } from './api'
import { openNocalDeepLink, showApiSuccess } from './components'

type CreateNoteFormValues = {
  title: string
  content: string
  openAfterCreate: boolean
}

export default function CreateNoteCommand() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [openAfterCreate, setOpenAfterCreate] = useState(false)

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Note"
            onSubmit={async (values: CreateNoteFormValues) => {
              const note = await createNote({
                title: values.title.trim(),
                content: values.content
              })

              if (values.openAfterCreate) {
                await openNocalDeepLink(`note?id=${note.id}`)
              }

              await popToRoot()
              await showApiSuccess('Note Created', note.title || 'Untitled')
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new nocal note without leaving Raycast." />
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="content"
        title="Content"
        value={content}
        onChange={setContent}
      />
      <Form.Checkbox
        id="openAfterCreate"
        label="Open in nocal after creating"
        value={openAfterCreate}
        onChange={setOpenAfterCreate}
      />
    </Form>
  )
}
