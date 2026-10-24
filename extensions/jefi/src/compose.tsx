import { Action, ActionPanel, Form, Icon, popToRoot } from '@raycast/api'
import { usePromise } from '@raycast/utils'
import { links } from './lib/jefi'
import { client, openInJefi, quiet } from './lib/raycast'

type Values = { account: string; to: string; cc: string; subject: string; body: string }

// Opens Jefi's composer prefilled; nothing is sent from here (docs/integrations.md: actions go through the app).
export default function Compose() {
  // The account picker is a nicety: if the CLI isn't reachable the form still works without it.
  const { data: accounts } = usePromise(() => client().accounts(), [], { onError: quiet })

  async function submit(v: Values) {
    await openInJefi(
      links.compose({ to: v.to, cc: v.cc, subject: v.subject, body: v.body, account: v.account }),
    )
    await popToRoot({ clearSearchBar: true })
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open in Jefi" icon={Icon.AppWindow} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Jefi opens a draft for you to review and send." />
      {accounts && accounts.length > 1 ? (
        <Form.Dropdown id="account" title="From" storeValue>
          {accounts.map((a) => (
            <Form.Dropdown.Item key={a.id} value={a.id} title={a.email} />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.TextField id="to" title="To" placeholder="nora@example.com" />
      <Form.TextField id="cc" title="Cc" />
      <Form.TextField id="subject" title="Subject" />
      <Form.TextArea id="body" title="Message" enableMarkdown={false} />
    </Form>
  )
}
