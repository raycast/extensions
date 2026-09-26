import { Icon, MenuBarExtra, openExtensionPreferences } from '@raycast/api'
import { useCachedPromise } from '@raycast/utils'
import { eventTime, menuBarTitle, nextEvent, truncate, untilLabel } from './lib/format'
import { JefiError, links } from './lib/jefi'
import { client, errorTitle, openInJefi, quiet } from './lib/raycast'

async function load() {
  const c = client()
  const [unread, events] = await Promise.all([c.unread(), c.today()])
  return { unread, next: nextEvent(events) ?? null }
}

// Cached so the menu bar keeps its last count between the 2-minute refreshes instead of flashing empty.
export default function UnreadMail() {
  const { data, isLoading, error } = useCachedPromise(load, [], { onError: quiet })
  const total = data?.unread.total ?? 0
  const next = data?.next

  return (
    <MenuBarExtra
      icon={total ? Icon.Envelope : Icon.CheckCircle}
      title={menuBarTitle(total)}
      tooltip={total ? `${total} unread in Jefi` : 'Jefi'}
      isLoading={isLoading}
    >
      {error ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item icon={Icon.Warning} title={errorTitle(error)} />
          {error instanceof JefiError && error.kind === 'not-installed' ? (
            <MenuBarExtra.Item
              title="Set Jefi’s Location…"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section title="Mail">
        <MenuBarExtra.Item
          icon={Icon.Tray}
          title={total ? `${total} unread` : 'Inbox zero'}
          onAction={() => openInJefi(links.inbox())}
        />
        {(data?.unread.accounts ?? [])
          .filter((a) => a.unread > 0)
          .map((a) => (
            <MenuBarExtra.Item
              key={a.id}
              icon={Icon.Envelope}
              title={a.email}
              subtitle={String(a.unread)}
              onAction={() => openInJefi(links.inbox(a.id))}
            />
          ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Next">
        {next ? (
          <MenuBarExtra.Item
            icon={Icon.Calendar}
            title={truncate(next.title || '(no title)', 40)}
            subtitle={`${eventTime(next)} · ${untilLabel(next)}`}
            onAction={() => openInJefi(next.url || links.event(next.id, next.occurrenceStart))}
          />
        ) : (
          <MenuBarExtra.Item
            icon={Icon.Calendar}
            title="Nothing else today"
            onAction={() => openInJefi(links.calendar())}
          />
        )}
        {next?.meetingUrl ? (
          <MenuBarExtra.Item
            icon={Icon.Video}
            title="Join Meeting"
            onAction={() => openInJefi(next.meetingUrl as string)}
          />
        ) : null}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Jefi" icon={Icon.AppWindow} onAction={() => openInJefi('jefi://')} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  )
}
