import { Action, ActionPanel, Icon, List } from '@raycast/api'
import { usePromise } from '@raycast/utils'
import { unreadFirst } from './lib/format'
import { links } from './lib/jefi'
import { client, ErrorEmptyView, openInJefi, quiet } from './lib/raycast'
import { ThreadItem } from './lib/thread-item'

export default function Inbox() {
  const { data, isLoading, error, revalidate } = usePromise(() => client().inbox({ limit: 50 }), [], {
    onError: quiet,
  })
  const threads = unreadFirst(data ?? [])
  const unread = threads.filter((t) => t.unread)
  const read = threads.filter((t) => !t.unread)

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter inbox">
      {error ? (
        <ErrorEmptyView error={error} retry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="Inbox is empty"
          description="Nothing waiting for you."
          actions={
            <ActionPanel>
              <Action title="Open Jefi" icon={Icon.AppWindow} onAction={() => openInJefi(links.inbox())} />
            </ActionPanel>
          }
        />
      )}
      {!error && (
        <>
          <List.Section title="Unread" subtitle={unread.length ? String(unread.length) : undefined}>
            {unread.map((t) => (
              <ThreadItem key={t.id} thread={t} onReload={revalidate} />
            ))}
          </List.Section>
          <List.Section title="Earlier">
            {read.map((t) => (
              <ThreadItem key={t.id} thread={t} onReload={revalidate} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  )
}
