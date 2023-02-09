import { ActionPanel, List, Action, Icon, LocalStorage } from '@raycast/api'
import Book from './book'
import { useBooks } from './useApi'

export default function Command() {
  const { data, isLoading } = useBooks()

  const clearSyncHistory = async () => {
    await LocalStorage.clear()
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
                  target={<Book id={book.id} />}
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
