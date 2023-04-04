import { Color, getPreferenceValues, Icon, List } from '@raycast/api'

import { useMount, useUpdateEffect } from 'react-use'

import { useStore } from '@/Store'
import Actions from '@/components/Actions'
import useTokens from '@/hooks/useTokens'
import { Preferences } from '@/types'

export default function Prompt() {
  const { currentPrompt, loading } = useStore()
  const { tokens, updateTokens } = useTokens()
  const preferences = getPreferenceValues<Preferences>()

  function getTitle() {
    if (currentPrompt.length === 0) {
      return ''
    } else if (loading) {
      return 'Loading...'
    } else {
      return 'Submit'
    }
  }

  function getAccessories() {
    if (preferences.imeFix || currentPrompt.length === 0 || loading) {
      return []
    } else {
      return [{ text: `${tokens} tokens` }]
    }
  }

  function getDetailText() {
    if (preferences.imeFix) {
      return 'Input text into prompt, select "Submit," then press Enter.'
    } else {
      return 'Input text into prompt and press Enter.'
    }
  }

  useMount(() => {
    updateTokens(currentPrompt)
  })

  useUpdateEffect(() => {
    updateTokens(currentPrompt)
  }, [currentPrompt])

  return (
    <>
      {/* dummy submit list item for ime fix */}
      {preferences.imeFix && (
        <List.Item
          title=""
          subtitle={`${tokens} tokens`}
          id="dummySubmit"
          detail={<List.Item.Detail markdown={getDetailText()} />}
        />
      )}

      <List.Item
        id="submit"
        icon={{
          source: Icon.ArrowRight,
          tintColor:
            currentPrompt.length > 0 ? Color.PrimaryText : Color.SecondaryText,
        }}
        title={getTitle()}
        subtitle={currentPrompt.length > 0 ? '' : 'Submit'}
        accessories={getAccessories()}
        actions={<Actions type="prompt" />}
        detail={<List.Item.Detail markdown={getDetailText()} />}
      />
    </>
  )
}
