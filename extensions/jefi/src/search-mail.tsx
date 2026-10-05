import { Action, ActionPanel, Icon, List } from '@raycast/api'
import { usePromise } from '@raycast/utils'
import { useState } from 'react'
import { links } from './lib/jefi'
import { client, ErrorEmptyView, openInJefi, quiet } from './lib/raycast'
import { ThreadItem } from './lib/thread-item'

export default function SearchMail() {
  const [query, setQuery] = useState('')
  const q = query.trim()
  const { data, isLoading, error, revalidate } = usePromise(
    (text: string) => (text ? client().search(text, { limit: 30 }) : Promise.resolve([])),
    [q],
    { onError: quiet },
  )

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search mail — from:nora invoice, has:attachment…"
    >
      {error ? (
        <ErrorEmptyView error={error} retry={revalidate} />
      ) : !q ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search your mail"
          description="Same search as in Jefi: words, from:, to:, subject:, has:attachment."
        />
      ) : (
        <List.EmptyView
          icon={Icon.Tray}
          title="No mail found"
          description={`Nothing matches “${q}”.`}
          actions={
            <ActionPanel>
              <Action
                title="Search in Jefi"
                icon={Icon.AppWindow}
                onAction={() => openInJefi(links.search(q))}
              />
            </ActionPanel>
          }
        />
      )}
      {!error && (data ?? []).map((t) => <ThreadItem key={t.id} thread={t} />)}
    </List>
  )
}
