import { Action, ActionPanel, Form } from '@raycast/api'
import Handlebars from 'handlebars'
import { ifeq } from './helpers'

export type SettingsValues = {
  author: string
  authorSupertag: string
  category: string
  coverImageUrl: string
  highlightColor: string
  highlightHighlightedAt: string
  highlightLocation: string
  highlightNote: string
  highlightNoteSupertag: string
  highlightSupertag: string
  highlightTags: string
  highlightUpdatedAt: string
  highlightUrl: string
  id: string
  readwiseUrl: string
  source: string
  articleSupertag: string
  bookSupertag: string
  podcastSupertag: string
  supplementalSupertag: string
  tweetSupertag: string
  template: string
  title: string
  url: string
}

type SettingsProps = {
  handleSave: (values: SettingsValues) => void
  template: string
}

export default function Settings({ handleSave, template }: SettingsProps) {
  const h = Handlebars.compile(template)
  const exampleBook = {
    author: 'Sönke Ahrens',
    category: 'books',
    cover_image_url: 'https://example.com/image.png',
    id: '1',
    num_highlights: 2,
    source: 'kindle',
    source_url: null,
    highlights_url: 'https://example.com/book/highlights',
    title: 'Take Smart Notes',
    highlights: [
      {
        text: 'Highlight',
        location: 10,
        id: 1,
      },
      {
        text: 'Highlight with a note',
        note: 'This is a note',
        id: 2,
      },
      {
        text: 'Highlight with a multiline note',
        note: 'This is a note\n\nwith multiple lines',
        id: 3,
      },
      {
        text: 'Highlight with a note and tags',
        note: 'This is a note',
        tags: [{ name: 'tag1' }, { name: 'tag2' }],
        id: 4,
      },
    ].map((highlight) => ({
      ...highlight,
      note: highlight.note?.split('\n').filter((line) => line) ?? [],
      tags: highlight.tags?.map((tag) => tag.name).join(', ') ?? [],
    })),
  }
  const output = h(exampleBook, {
    helpers: {
      ifeq,
    },
  })

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
        text="Readwise fields -> Tana fields (leave blank to omit from output). The name of the node will always be the source's title."
      />
      <Form.TextField
        id="articleSupertag"
        title="Article Supertag"
        info="# can be omitted"
        storeValue
      />
      <Form.TextField
        id="bookSupertag"
        title="Book Supertag"
        info="# can be omitted"
        storeValue
      />
      <Form.TextField
        id="podcastSupertag"
        title="Podcast Supertag"
        info="# can be omitted"
        storeValue
      />
      <Form.TextField
        id="supplementalSupertag"
        title="Supplemental Supertag"
        info="# can be omitted"
        storeValue
      />
      <Form.TextField
        id="tweetSupertag"
        title="Tweet Supertag"
        info="# can be omitted"
        storeValue
      />
      <Form.TextField id="title" title="Title" storeValue />
      <Form.TextField id="author" title="Author" storeValue />
      <Form.TextField
        id="authorSupertag"
        title="Author Supertag"
        storeValue
        info="This supertag is added to the author, i.e., #person. # can be omitted."
      />
      <Form.TextField id="id" title="ID" storeValue />
      <Form.TextField id="category" title="Category" storeValue />
      <Form.TextField id="source" title="Source" storeValue />
      <Form.TextField id="coverImageUrl" title="Cover URL" storeValue />
      <Form.TextField
        id="url"
        title="URL"
        storeValue
        info="URL to the source"
      />
      <Form.TextField
        id="readwiseUrl"
        title="Readwise URL"
        storeValue
        info="URL to highlights in Readwise"
      />
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
        info="If this is omitted the note will be added as a child node of the highlight."
        storeValue
      />
      <Form.TextField
        id="highlightNoteSupertag"
        title="Note Supertag"
        info="Tag notes with a supertag. # can be omitted"
        storeValue
      />
      <Form.TextField id="highlightColor" title="Color" storeValue />
      <Form.TextField id="highlightTags" title="Tags" storeValue />
      <Form.TextField id="highlightUrl" title="URL" storeValue />
      <Form.TextField
        id="highlightHighlightedAt"
        title="Highlighted At"
        storeValue
      />
      <Form.TextField id="highlightUpdatedAt" title="Updated At" storeValue />
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
