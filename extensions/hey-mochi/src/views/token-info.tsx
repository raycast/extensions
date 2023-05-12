import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from '@raycast/api'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { COIN_QUERY_TITLE, MOCHI_HOST } from '../libs/constants'
import { generateMarkdown } from '../libs/generate-markdown'
import { CoinQuery, GeneratedAction, TokenInfomation } from '../models'
import { useAppStore } from '../stores/app'

type TokenTrendProps = {
  generatedAction: GeneratedAction
  action: () => void
}

export const TokenInfo = ({ generatedAction, action }: TokenTrendProps) => {
  const [setIsLoading, setIsShowingDetail] = useAppStore((state) => [state.setIsLoading, state.setIsShowingDetail])
  const [data, setData] = useState<CoinQuery | null>()
  const [tokenData, setTokenData] = useState<TokenInfomation | null>()

  useEffect(() => {
    const callMochi = async () => {
      setIsLoading(true)
      try {
        const queryUrl = `${MOCHI_HOST}${generatedAction?.endpoint.toLowerCase()}`

        const response = await axios.get<CoinQuery>(queryUrl)
        setData(response.data)
        setIsShowingDetail(false)
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Mochi ain't find any!",
          message: String(error),
        })
      } finally {
        setIsLoading(false)
      }
    }

    generatedAction && callMochi()

    return () => {
      setTokenData(null)
    }
  }, [generatedAction])

  useEffect(() => {
    if (data?.data && data.data.length === 1) getTokenInfo(data.data[0].id)
  }, [data?.data])

  const getTokenInfo = async (id: string) => {
    setIsLoading(true)
    try {
      const url = `${MOCHI_HOST}/defi/coins/${id}`
      const response = await axios.get<TokenInfomation>(url)

      setTokenData(response.data)
      setIsShowingDetail(true)
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Mochi is getting sick 🤒 while getting the token info',
        message: String(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {data && data.data.length > 1 && !tokenData ? (
        <List.Section title={`🔎 ${COIN_QUERY_TITLE[Math.floor(Math.random() * COIN_QUERY_TITLE.length)]}`}>
          {data.data.map((coin) => (
            <List.Item
              key={coin.id}
              title={coin.name}
              subtitle={coin.symbol.toUpperCase()}
              actions={
                <ActionPanel>
                  <Action title={`Get ${coin.name} info`} onAction={() => getTokenInfo(coin.id)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          title='Mochi is collecting the data from market!'
          description={"Won't take long, hang on!"}
          icon={Icon.Download}
        />
      )}
      {tokenData && (
        <List.Section title={`💰 Alright, this's ${tokenData.data.name} information`}>
          <List.Item
            key={tokenData.data.id}
            title={tokenData.data.name}
            subtitle={tokenData.data.symbol.toUpperCase()}
            actions={
              <ActionPanel>
                <Action title='Get answer' onAction={action} />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={generateMarkdown(tokenData.data.image.large, tokenData.data.name)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title='Name' />
                    <List.Item.Detail.Metadata.Label
                      title={`${tokenData.data.name} — ${tokenData.data.symbol.toUpperCase()}`}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title='Market Cap Rank'
                      text={`#${tokenData.data.market_cap_rank.toString()}`}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title='Current Price' />
                    {Object.entries(tokenData.data.market_data.current_price).map(([key, value]) => (
                      <List.Item.Detail.Metadata.Label
                        key={key}
                        title={`${tokenData.data.symbol.toUpperCase()}/${key.toUpperCase()}`}
                        text={value.toString()}
                      />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        </List.Section>
      )}
    </>
  )
}
