import { ActionPanel, List, Action, Icon, LocalStorage } from '@raycast/api'
import React from 'react'
import Book from './book'
import Settings from './settings'
import { useBooks } from './useApi'

export default function Command() {
  const [template, setTemplate] = React.useState<string>('')

  const { data, isLoading } = useBooks()

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
                <Action.Push title="Update Template" target={<Settings />} />
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
