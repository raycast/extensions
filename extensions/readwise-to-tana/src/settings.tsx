import { Action, ActionPanel, Form } from '@raycast/api'
import Handlebars from 'handlebars'
import { Book, Highlight } from './useApi'

export type SettingsValues = {
  author: string
  category: string
  coverImageUrl: string
  highlightNote: string
  highlightSupertag: string
  highlightLocation: string
  id: string
  source: string
  supertag: string
  template: string
}

type SettingsProps = {
  handleSave: (values: SettingsValues) => void
  template: string
}

export default function Settings({ handleSave, template }: SettingsProps) {
  const h = Handlebars.compile(template)
  const output = h({
    author: 'Sönke Ahrens',
    category: 'book',
    cover_image_url: 'https://example.com/image.png',
    id: '1',
    num_highlights: 2,
    source: 'kindle',
    title: 'Take Smart Notes',
    highlights: [
      {
        text: 'This is a highlight',
        location: 10,
        id: 1,
      },
      {
        text: 'This is a highlight with a note',
        note: 'This is a note',
        id: 2,
      },
    ],
  } as Book & { highlights: Highlight[] })

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSave} title="Save template" />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Source"
        text="Readwise fields -> Tana fields (leave blank to omit from output). Title is always included."
      />
      <Form.TextField
        id="supertag"
        title="Supertag"
        info="# can be omitted"
        storeValue
      />
      <Form.TextField id="author" title="Author" storeValue />
      <Form.TextField id="id" title="ID" storeValue />
      <Form.TextField id="category" title="Category" storeValue />
      <Form.TextField id="source" title="Source" storeValue />
      <Form.TextField id="coverImageUrl" title="Cover URL" storeValue />
      <Form.Separator />
      <Form.Description
        title="Highlight"
        text="Highlight fields to include. Text is always included."
      />
      <Form.TextField
        id="highlightSupertag"
        info="# can be omitted"
        title="Supertag"
        storeValue
      />
      <Form.TextField id="highlightLocation" title="Location" storeValue />
      <Form.TextField
        id="highlightNote"
        title="Note"
        info="A child node with '**Note:** {{note}}' will be added if this is omitted"
        storeValue
      />
      <Form.Separator />
      <Form.TextArea
        info="This is the compiled template that will be used to generate the note."
        id="template"
        title="Compiled Template"
        onChange={() => {
          /* noop */
        }}
        storeValue
        value={output}
      />
    </Form>
  )
}
