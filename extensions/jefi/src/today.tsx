import { Action, ActionPanel, Color, Icon, Keyboard, List } from '@raycast/api'
import { usePromise } from '@raycast/utils'
import { eventTime, inviteWhen } from './lib/format'
import { links, type Invite, type JefiEvent } from './lib/jefi'
import { client, ErrorEmptyView, openInJefi, quiet } from './lib/raycast'

async function load() {
  const c = client()
  const [events, invites] = await Promise.all([c.today(), c.invites()])
  return { events, invites }
}

export default function Today() {
  const { data, isLoading, error, revalidate } = usePromise(load, [], { onError: quiet })
  const now = Date.now()

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter today's events">
      {error ? (
        <ErrorEmptyView error={error} retry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Calendar}
          title="Nothing on today"
          description="No events or invitations waiting."
          actions={
            <ActionPanel>
              <Action
                title="Open Calendar"
                icon={Icon.AppWindow}
                onAction={() => openInJefi(links.calendar())}
              />
            </ActionPanel>
          }
        />
      )}
      {!error && data ? (
        <>
          <List.Section title="Today">
            {data.events.map((e) => (
              <EventItem
                key={`${e.id}:${e.occurrenceStart}`}
                event={e}
                past={new Date(e.end).getTime() < now}
                onReload={revalidate}
              />
            ))}
          </List.Section>
          <List.Section
            title="Invitations"
            subtitle={data.invites.length ? String(data.invites.length) : undefined}
          >
            {data.invites.map((i) => (
              <InviteItem key={`${i.eventId}:${i.start}`} invite={i} />
            ))}
          </List.Section>
        </>
      ) : null}
    </List>
  )
}

function EventItem({ event, past, onReload }: { event: JefiEvent; past: boolean; onReload: () => void }) {
  const url = event.url || links.event(event.id, event.occurrenceStart)
  const accessories: List.Item.Accessory[] = []
  if (event.meetingUrl) accessories.push({ icon: Icon.Video, tooltip: 'Has a meeting link' })
  accessories.push({ text: eventTime(event) })
  return (
    <List.Item
      icon={{
        source: past ? Icon.Circle : Icon.CircleFilled,
        tintColor: event.calendar?.color || Color.Blue,
      }}
      title={event.title || '(no title)'}
      subtitle={event.location || event.calendar?.name}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Open in Jefi" icon={Icon.AppWindow} onAction={() => openInJefi(url)} />
          {event.meetingUrl ? (
            <Action.OpenInBrowser
              title="Join Meeting"
              icon={Icon.Video}
              url={event.meetingUrl}
              shortcut={{ modifiers: ['cmd'], key: 'j' }}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Title"
            content={event.title}
            shortcut={{ modifiers: ['cmd'], key: 'c' }}
          />
          {event.meetingUrl ? (
            <Action.CopyToClipboard
              title="Copy Meeting Link"
              content={event.meetingUrl}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onReload}
          />
        </ActionPanel>
      }
    />
  )
}

function InviteItem({ invite }: { invite: Invite }) {
  return (
    <List.Item
      icon={{ source: Icon.Envelope, tintColor: Color.Orange }}
      title={invite.title || '(no title)'}
      subtitle={invite.organizer ? invite.organizer.name || invite.organizer.email : undefined}
      accessories={[{ tag: { value: 'Awaiting reply', color: Color.Orange } }, { text: inviteWhen(invite) }]}
      actions={
        <ActionPanel>
          <Action
            title="Open in Jefi"
            icon={Icon.AppWindow}
            onAction={() =>
              openInJefi(invite.threadId ? links.thread(invite.threadId) : links.event(invite.eventId))
            }
          />
          <Action.CopyToClipboard
            title="Copy Title"
            content={invite.title}
            shortcut={{ modifiers: ['cmd'], key: 'c' }}
          />
        </ActionPanel>
      }
    />
  )
}
