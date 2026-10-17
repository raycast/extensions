import { Action, ActionPanel, Form, Icon, popToRoot } from '@raycast/api'
import { links } from './lib/jefi'
import { openInJefi } from './lib/raycast'

type Values = { title: string; body: string }

export default function NewNote() {
  async function submit(v: Values) {
    await openInJefi(links.newNote({ title: v.title, body: v.body }))
    await popToRoot({ clearSearchBar: true })
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open in Jefi" icon={Icon.AppWindow} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Untitled" />
      <Form.TextArea id="body" title="Note" enableMarkdown />
    </Form>
  )
}
