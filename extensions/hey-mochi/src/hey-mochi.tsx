import { Action, ActionPanel, getSelectedText, Icon, List, showToast, Toast } from '@raycast/api'
import axios from 'axios'
import { Configuration, OpenAIApi } from 'openai'
import { useEffect, useMemo, useState } from 'react'
import { PROMPT_PREFIX, PROMPT_SURFIX } from './libs/constants'
import { GeneratedAction } from './models'
import { useAppStore } from './stores/app'
import { ChainInfo, GasTrack, TokenInfo, TokenTrend } from './views'

// https://hey-mochi-api.vercel.app/api/secret
export default function Command() {
  const [openaiSecretKey, setOpenaiSecretKey] = useState('')

  const configuration = useMemo(
    () =>
      openaiSecretKey
        ? new Configuration({
            apiKey: openaiSecretKey,
          })
        : null,
    [openaiSecretKey],
  )

  const openai = useMemo(() => (configuration ? new OpenAIApi(configuration) : null), [configuration])

  useEffect(() => {
    const fetchOpenAiSecret = async () => {
      const response = await axios.get<{ key: string }>('https://hey-mochi-api.vercel.app/api/secret')
      setOpenaiSecretKey(response.data.key)
    }

    fetchOpenAiSecret()
  }, [])

  const [prompt, setPrompt] = useState('')
  const [isLoading, isShowingDetail, setIsLoading, setIsShowingDetail] = useAppStore((state) => [
    state.isLoading,
    state.isShowingDetail,
    state.setIsLoading,
    state.setIsShowingDetail,
  ])

  const [generatedAction, setGeneratedAction] = useState<GeneratedAction | null>(null)

  const handleAction = async () => {
    if (prompt) {
      setIsLoading(true)
      setIsShowingDetail(false)

      let attach: string = ''

      try {
        try {
          const selectedText = await getSelectedText()
          attach = `if the prompt is about price, change endpoint token to ${selectedText}`
        } catch (error) {
          attach = ''
        }

        const response = await openai.createCompletion({
          model: 'text-davinci-003',
          prompt: `${PROMPT_PREFIX} with the prompt: \"${prompt}\" ${PROMPT_SURFIX} ${attach}`,
          temperature: 0.7,
          max_tokens: 256,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        })
        const generatedAction = JSON.parse(response.data.choices[0].text.match(/{([^}]+)}/)[0]) as GeneratedAction
        setGeneratedAction(generatedAction)
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Mochi is getting sick 🤒',
          message: String(error),
        })
      } finally {
        setIsLoading(false)
      }
    }
    setPrompt('')
  }

  return (
    <>
      <List
        searchText={prompt}
        filtering={false}
        throttle={false}
        onSearchTextChange={setPrompt}
        navigationTitle='Ask Mochi'
        searchBarPlaceholder='Ask Mochi about today market'
        isLoading={!Boolean(openaiSecretKey) || isLoading}
        isShowingDetail={isShowingDetail}
        actions={
          <ActionPanel>
            <Action title='Get answer' onAction={handleAction} />
          </ActionPanel>
        }>
        {generatedAction ? (
          <>
            {
              {
                'chain-info': <ChainInfo action={handleAction} generatedAction={generatedAction} />,
                'token-trend': <TokenTrend action={handleAction} generatedAction={generatedAction} />,
                'gas-track': <GasTrack action={handleAction} generatedAction={generatedAction} />,
                'token-info': <TokenInfo action={handleAction} generatedAction={generatedAction} />,
              }[generatedAction.type]
            }
          </>
        ) : (
          <List.EmptyView
            title='Ask Mochi about market token!'
            description={'Type your question or prompt from the search bar and hit the enter key'}
            icon={Icon.QuestionMark}
          />
        )}
      </List>
    </>
  )
}
