import { Action, ActionPanel, Color, Icon, Keyboard, List } from '@raycast/api'
import { mailDate, senderName } from './format'
import { links, type Thread } from './jefi'
import { openInJefi } from './raycast'

export function ThreadItem({ thread, onReload }: { thread: Thread; onReload?: () => void }) {
  const accessories: List.Item.Accessory[] = []
  if (thread.hasAttachments) accessories.push({ icon: Icon.Paperclip, tooltip: 'Has attachments' })
  if (thread.starred)
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: 'Starred' })
  accessories.push({ text: mailDate(thread.date) })
  const subject = thread.subject || '(no subject)'
  return (
    <List.Item
      icon={thread.unread ? { source: Icon.CircleFilled, tintColor: Color.Blue } : Icon.Envelope}
      title={subject}
      subtitle={senderName(thread)}
      keywords={[thread.from.email, thread.snippet].filter(Boolean)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Open in Jefi"
            icon={Icon.AppWindow}
            onAction={() => openInJefi(thread.url || links.thread(thread.id))}
          />
          <Action.CopyToClipboard
            title="Copy Subject"
            content={subject}
            shortcut={{ modifiers: ['cmd'], key: 'c' }}
          />
          <Action.CopyToClipboard
            title="Copy Sender Address"
            content={thread.from.email}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="Reply in Jefi"
            icon={Icon.Reply}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'r' }}
            onAction={() =>
              openInJefi(
                links.compose({
                  to: thread.from.email,
                  subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
                  account: thread.accountId,
                }),
              )
            }
          />
          {onReload ? (
            <Action
              title="Reload"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onReload}
            />
          ) : null}
        </ActionPanel>
      }
    />
  )
}
