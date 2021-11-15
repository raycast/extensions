import { ActionPanel, Form, FormValue, SubmitFormAction, popToRoot, showToast, ToastStyle } from '@raycast/api'
import { createGoLink } from './api'

export default function CreateGoLink() {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Create GoLink" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="URL" />
      <Form.TextField id="name" title="Name" placeholder="Name" />
      <Form.TextArea id="description" title="Description" placeholder="Description" />
    </Form>
  )
}

async function submit(values: Record<string, FormValue>) {
  const body = { ...values }

  showToast(ToastStyle.Animated, 'Creating GoLink...')

  await createGoLink(body.name as string, body.url as string, body.description as string)

  popToRoot()
}
