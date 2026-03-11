import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from '@raycast/api'
import { createGoLink } from './api'

export default function CreateGoLink() {
  const submit = async (values: Form.Values) => {
    try {
      await showToast({ style: Toast.Style.Animated, title: 'Creating GoLink...' })

      await createGoLink(values.short as string, values.long as string)

      await showToast({ style: Toast.Style.Success, title: 'GoLink created!' })

      popToRoot()
    } catch (err) {
      const error = err as Error
      await showToast({ style: Toast.Style.Failure, title: 'Error occurred', message: error.message })
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Go Link" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="short" title="Short Name" placeholder="e.g. docs" />
      <Form.TextField id="long" title="URL" placeholder="e.g. https://example.com/docs" />
    </Form>
  )
}
