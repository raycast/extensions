import {
  ActionPanel,
  Action,
  showToast,
  Clipboard,
  Icon,
  getPreferenceValues,
  useNavigation,
} from '@raycast/api'

import { updateState, useStore } from '@/Store'
import SystemMessageForm from '@/components/SystemMessageForm'
import useCompletion from '@/hooks/useCompletion'
import { Preferences } from '@/types'

type PromptActionProps = {
  type: 'prompt'
}
type MessageActionProps = {
  type: 'message'
  content: string
}

type ActionProps = PromptActionProps | MessageActionProps

export default function Actions(props: ActionProps) {
  const { currentPrompt, chatMessages } = useStore()
  const { chatCompletion } = useCompletion()
  const { push } = useNavigation()
  const preferences = getPreferenceValues<Preferences>()

  async function submitPrompt() {
    console.log('submitPrompt', currentPrompt)

    if (preferences.imeFix) {
      updateState({ selectedItemId: 'prompt' })
    }

    await chatCompletion(currentPrompt)
  }

  function clear() {
    console.log('clear')
    updateState({
      chatMessages: [],
      totalTokens: 0,
    })
    showToast({ title: 'Conversation cleared.' })
  }

  async function copy(text: string) {
    console.log('copy', text)
    await Clipboard.copy(text)
    await showToast({ title: 'Copied to clipboard.' })
  }

  function focusToPrompt() {
    console.log('focusToPrompt')

    updateState({ selectedItemId: '' })

    setTimeout(() => {
      if (preferences.imeFix) {
        updateState({ selectedItemId: 'dummySubmit' })
      } else {
        updateState({ selectedItemId: 'submit' })
      }
    }, 100)
  }

  function setSystemMessage() {
    console.log('setSystemMessage')
    push(<SystemMessageForm />)
  }

  return (
    <ActionPanel>
      {props.type === 'prompt' && currentPrompt.length > 0 && (
        <Action
          title="Submit Prompt"
          icon={Icon.ArrowRight}
          onAction={submitPrompt}
          shortcut={{ modifiers: ['cmd'], key: 'enter' }}
        />
      )}

      {preferences.imeFix && (
        <Action
          title="Focus Prompt"
          icon={Icon.ArrowUp}
          onAction={focusToPrompt}
          shortcut={{ modifiers: ['cmd'], key: 'l' }}
        />
      )}

      {props.type === 'prompt' && (
        <Action
          title="Set System Message"
          icon={Icon.Cog}
          onAction={setSystemMessage}
          shortcut={{ modifiers: ['cmd'], key: 's' }}
        />
      )}

      {props.type === 'message' && (
        <>
          <Action
            title="Copy Text"
            icon={Icon.CopyClipboard}
            onAction={() => copy(props.content)}
            shortcut={{ modifiers: ['cmd'], key: 'c' }}
          />

          {chatMessages.length > 0 && (
            <Action
              title="Clear Conversation"
              icon={Icon.Trash}
              onAction={clear}
              style={Action.Style.Destructive}
            />
          )}
        </>
      )}
    </ActionPanel>
  )
}
