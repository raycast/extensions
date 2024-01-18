import {
  ActionPanel,
  Form,
  FormValue,
  Icon,
  List,
  SubmitFormAction,
  popToRoot,
  showToast,
  ToastStyle,
  useNavigation,
} from '@raycast/api'
import { AxiosError } from 'axios'
import { createGoLink } from './api'

export default function CreateGoLink() {
  const { push } = useNavigation()

  const submit = async (values: Record<string, FormValue>) => {
    try {
      const body = { ...values }

      showToast(ToastStyle.Animated, 'Creating GoLink...')

      await createGoLink(body.name as string, body.url as string, body.description as string)

      showToast(ToastStyle.Success, 'GoLink created!')

      popToRoot()
    } catch (err) {
      const error = err as AxiosError

      showToast(ToastStyle.Failure, `Error occurred: ${error.message}`)

      if (error.response?.status === 401) {
        push(
          <List>
            <List.Item
              icon={Icon.ExclamationMark}
              title="The API token is invalid or deactivated"
              accessoryTitle="Go to Extensions → GoLinks"
            />
          </List>
        )
      }
    }
  }

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
