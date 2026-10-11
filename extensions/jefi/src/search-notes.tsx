import { Action, ActionPanel, Icon, Keyboard, List } from '@raycast/api'
import { usePromise } from '@raycast/utils'
import { useState } from 'react'
import { mailDate } from './lib/format'
import { links } from './lib/jefi'
import { client, ErrorEmptyView, openInJefi, quiet } from './lib/raycast'

// An empty query lists recent notes, so the command is useful before typing.
export default function SearchNotes() {
  const [query, setQuery] = useState('')
  const q = query.trim()
  const { data, isLoading, error, revalidate } = usePromise(
    (text: string) => client().notes({ limit: 30, query: text || undefined }),
    [q],
    { onError: quiet },
  )

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search notes"
    >
      {error ? (
        <ErrorEmptyView error={error} retry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Document}
          title={q ? 'No notes found' : 'No notes yet'}
          description={q ? `Nothing matches “${q}”.` : 'Notes you write in Jefi show up here.'}
          actions={
            <ActionPanel>
              <Action
                title="Create Note in Jefi"
                icon={Icon.Plus}
                onAction={() => openInJefi(links.newNote({ title: q }))}
              />
            </ActionPanel>
          }
        />
      )}
      {!error &&
        (data ?? []).map((n) => (
          <List.Item
            key={n.id}
            icon={Icon.Document}
            title={n.title || 'Untitled'}
            subtitle={n.snippet}
            accessories={[{ text: mailDate(n.updatedAt) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Jefi"
                  icon={Icon.AppWindow}
                  onAction={() => openInJefi(links.note(n.id))}
                />
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={n.title}
                  shortcut={{ modifiers: ['cmd'], key: 'c' }}
                />
                <Action
                  title="Create Note"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  onAction={() => openInJefi(links.newNote({}))}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  )
}
