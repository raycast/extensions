import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  useNavigation,
} from '@raycast/api'

import { useState } from 'react'

import { useStore, updateState } from '@/Store'

type FormValues = {
  systemMessage: string
}

export default function SystemMessageForm() {
  const { pop } = useNavigation()
  const { systemMessage } = useStore()
  const [tmpSystemMessage, setTmpSystemMessage] = useState(systemMessage)

  function submit(values: FormValues) {
    console.log('submit', values)
    updateState({ systemMessage: values.systemMessage })
    pop()
    showToast({ title: 'System message set.' })
  }

  function clear() {
    console.log('clear')
    setTmpSystemMessage('')
    updateState({
      systemMessage: '',
    })
    showToast({ title: 'System message cleared.' })
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={submit} />
          <Action
            title="Clear Message"
            icon={Icon.Trash}
            onAction={clear}
            style={Action.Style.Destructive}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="systemMessage"
        title="System Message"
        value={tmpSystemMessage}
        onChange={setTmpSystemMessage}
        info="The system message helps set the behavior of the assistant."
        placeholder="You are a helpful assistant"
        autoFocus
      />
    </Form>
  )
}
