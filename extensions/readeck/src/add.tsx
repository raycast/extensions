import { Action, ActionPanel, Icon, Form, showToast, Toast, getPreferenceValues } from '@raycast/api'
import { useForm } from '@raycast/utils'
import axios, { AxiosError } from 'axios'
import { AddFormValues } from './interfaces'

const { serverUrl, apiToken } = getPreferenceValues<{ serverUrl: string; apiToken: string }>()
const saveLink = async (values: AddFormValues) => {
  try {
    const response = await axios.post(
      serverUrl + '/api/bookmarks',
      {
        url: values.url,
        title: values.title,
        labels: !values.labels ? [] : values.labels.split(',').map((label) => label.trim()),
      },
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
      },
    )

    if (response.status !== 200 && response.status !== 202) {
      throw new Error('Failed to post link')
    }

    showToast({
      style: Toast.Style.Success,
      title: 'Link posted successfully',
    })
  } catch (error) {
    const axiosError = error as AxiosError
    console.error('Error posting link:', axiosError)
    if (axiosError.response) {
      const status = axiosError.response.status
      if (status === 400) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Bad Request',
          message: 'The request was malformed. Please check the data and try again.',
        })
      } else if (status === 401) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Unauthorized',
          message: 'The request token found in the Authorization header is not valid.',
        })
      } else if (status === 403) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Forbidden',
          message: "The user doesn't have permission.",
        })
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to post link',
          message: axiosError.message,
        })
      }
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to post link',
        message: axiosError.message,
      })
    }
  }
}

export default () => {
  const { handleSubmit } = useForm<AddFormValues>({
    async onSubmit(values) {
      if (!values.url) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Validation Error',
          message: 'URL cannot be empty.',
        })
        return
      }

      await saveLink(values)
    },
  })

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.PlusSquare}
            title="Add Link"
            shortcut={{ modifiers: ['cmd'], key: 's' }}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="http://example.com/" autoFocus />
      <Form.TextField id="title" title="Title" placeholder="custom title" />
      <Form.TextField id="labels" title="Labels" placeholder="e.g. label-1,label-2" />
    </Form>
  )
}
