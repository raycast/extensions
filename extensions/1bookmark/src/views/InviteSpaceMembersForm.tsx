import { CachedQueryClientProvider } from '@/components/CachedQueryClientProvider'
import { trpc } from '@/utils/trpc.util'
import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from '@raycast/api'
import { useRef, useState } from 'react'

function Body(props: { spaceId: string }) {
  const { spaceId } = props
  const textAreaRef = useRef<Form.TextArea>(null)

  const { pop } = useNavigation()
  const invite = trpc.user.inviteMembers.useMutation()

  async function handleSubmit() {
    try {
      await invite.mutateAsync({ spaceId, emails })
      showToast({
        style: Toast.Style.Success,
        title: 'Sent invitations',
      })
      pop()
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to send invitations',
      })
    }
  }

  const [emails, setEmails] = useState<string[]>([])
  const handleChange = (values: string) => {
    const array = values.split(',').map((email) => email.trim())
    const splited =
      array.length === 1 ? array[0]!.split('\n').map((email) => email.trim()) : array.map((email) => email.trim())
    setEmails(splited)
  }

  const ready = emails.length > 0 && emails.length <= 20

  return (
    <Form
      actions={
        ready && (
          <ActionPanel>
            <Action.SubmitForm title="Send Invitations" onSubmit={handleSubmit} />
          </ActionPanel>
        )
      }
    >
      <Form.Description text="Input the email addresses of the users you want to invite, separated by commas or newlines." />
      <Form.TextArea
        id="emails"
        title="Emails"
        info="Description of the team"
        ref={textAreaRef}
        onChange={(value) => handleChange(value)}
      />

      <Form.Description text={`Send an invitation to ${emails.length} email addresses`} />

      {emails.length > 20 && <Form.Description text="⚠️ Email addresses are limited to 20" />}
    </Form>
  )
}

export const InviteSpaceMembersForm = (props: { spaceId: string }) => {
  const { spaceId } = props
  return (
    <CachedQueryClientProvider>
      <Body spaceId={spaceId} />
    </CachedQueryClientProvider>
  )
}
