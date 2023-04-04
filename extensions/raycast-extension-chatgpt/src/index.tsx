import { getPreferenceValues, LaunchProps, List } from '@raycast/api'

import { useMount } from 'react-use'

import { useStore, updateState, loadState } from '@/Store'
import Message from '@/components/Message'
import Submit from '@/components/Submit'
import useCompletion from '@/hooks/useCompletion'
import { Preferences } from '@/types'

type CommandProps = {
  prompt?: string
}

export default function Command(
  props: LaunchProps<{ arguments: CommandProps }>
) {
  const { prompt: defaultPrompt } = props.arguments
  const { currentPrompt, chatMessages, loading, totalTokens, selectedItemId } =
    useStore()
  const { chatCompletion } = useCompletion()
  const preferences = getPreferenceValues<Preferences>()

  function onSearchTextChange(text: string) {
    console.log('onSearchTextChange', text)
    updateState({ currentPrompt: text })

    if (text.length > 0) {
      if (preferences.imeFix) {
        updateState({ selectedItemId: 'dummySubmit' })
      } else {
        updateState({ selectedItemId: 'submit' })
      }
    }
  }

  useMount(async () => {
    console.log('index mounted', defaultPrompt)

    await loadState()

    if (defaultPrompt) {
      await chatCompletion(defaultPrompt)
    } else {
      onSearchTextChange('')
    }
  })

  return (
    <List
      filtering={false}
      searchBarPlaceholder="Your prompt here"
      onSearchTextChange={onSearchTextChange}
      searchText={currentPrompt}
      isShowingDetail
      isLoading={loading}
      selectedItemId={selectedItemId}
      navigationTitle={`Chat with GPT (Model: ${preferences.model})`}
    >
      <Submit />

      {/* messages */}
      {chatMessages.length > 0 && (
        <List.Section title={`Messages (Total ${totalTokens} tokens)`}>
          {[...chatMessages].reverse().map((message, index) => (
            <Message key={index} index={index} message={message} />
          ))}
        </List.Section>
      )}
    </List>
  )
}
