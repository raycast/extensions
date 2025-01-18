import { CachedQueryClientProvider } from '@/components/CachedQueryClientProvider'
import { trpc } from '@/utils/trpc.util'
import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from '@raycast/api'
import { useRef } from 'react'

interface FormValues {
  name: string
  image: string
  description: string
}

function Body() {
  const textFieldRef = useRef<Form.TextField>(null)
  const textAreaRef = useRef<Form.TextArea>(null)

  const { pop } = useNavigation()
  const create = trpc.team.create.useMutation()

  async function handleSubmit(form: FormValues) {
    try {
      await create.mutateAsync({
        name: form.name,
        image: form.image,
        description: form.description,
      })
      showToast({
        style: Toast.Style.Success,
        title: 'Team created',
      })
      // Teams view로 바로 이동해도 좋을 듯.
      pop()
    } catch (error) {
      // Handle error
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" ref={textFieldRef} />
      <Form.TextField
        id="image"
        title="Image"
        placeholder="https://..."
        info="Image upload is not supported yet. Please enter the team log image url."
      />
      <Form.TextArea id="description" title="Description" ref={textAreaRef} />
    </Form>
  )
}

export const NewTeamForm = () => {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  )
}
