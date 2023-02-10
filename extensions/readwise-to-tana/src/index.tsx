import {
  ActionPanel,
  List,
  Action,
  Icon,
  LocalStorage,
  useNavigation,
} from '@raycast/api'
import React from 'react'
import Book from './book'
import Settings from './settings'
import type { SettingsValues } from './settings'
import { useBooks } from './useApi'

export default function Command() {
  const [template, setTemplate] = React.useState<string>('')

  const { data, isLoading } = useBooks()
  const { pop } = useNavigation()

  React.useEffect(() => {
    const getTemplate = async () => {
      const template = await LocalStorage.getItem<string>('template')

      setTemplate(template ?? '%%tana%%\n')
    }

    getTemplate()
  }, [])

  const clearSyncHistory = async () => {
    // Clear all synced items and restore template
    await LocalStorage.clear()
    await LocalStorage.setItem('template', template)
  }

  const handleSave = async (values: SettingsValues) => {
    const {
      supertag,
      author,
      category,
      coverImageUrl,
      highlightNote,
      highlightSupertag,
      highlightLocation,
      id,
      source,
    } = values
    let t = '%%tana%%'

    t += supertag
      ? `\n- {{title}} #${supertag.replaceAll('#', '')}`
      : '\n- {{title}}'

    t += author ? `\n  - ${author}:: {{author}}` : ''
    t += id ? `\n  - ${id}:: {{id}}` : ''
    t += category ? `\n  - ${category}:: {{category}}` : ''
    t += source ? `\n  - ${source}:: {{source}}` : ''
    t += coverImageUrl ? `\n  - ${coverImageUrl}:: {{cover_image_url}}` : ''

    let highlights = '\n\n{{#each highlights}}'

    highlights += highlightSupertag
      ? `\n  - {{text}} #${highlightSupertag.replaceAll('#', '')}`
      : '\n  - {{text}}'
    highlights += highlightLocation
      ? `{{#if location}}\n    - ${highlightLocation}:: {{location}}{{/if}}`
      : ''
    highlights += highlightNote
      ? `{{#if note}}\n    - ${highlightNote}:: {{note}}{{/if}}`
      : '{{#if note}}\n    - **Note:** {{note}}{{/if}}'

    highlights += '\n{{/each}}'

    t += highlights

    setTemplate(t)

    await LocalStorage.setItem('template', t)
    pop()
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter Books">
      {data?.results.length === 0 ? (
        <List.EmptyView title="No books found" />
      ) : (
        data?.results.map((book) => (
          <List.Item
            key={book.id}
            icon={book.cover_image_url}
            title={book.title}
            subtitle={book.author}
            accessories={[
              { text: book.num_highlights.toString(), icon: Icon.Book },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Highlights"
                  target={<Book id={book.id} template={template} />}
                />
                <Action.Push
                  title="Update Template"
                  target={
                    <Settings template={template} handleSave={handleSave} />
                  }
                />
                <Action
                  title="Clear Sync History"
                  shortcut={{ modifiers: ['cmd'], key: 'c' }}
                  onAction={clearSyncHistory}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  )
}
