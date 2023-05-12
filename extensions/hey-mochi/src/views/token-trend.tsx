import { Action, ActionPanel, Color, Icon, Image, List, showToast, Toast } from '@raycast/api'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { MOCHI_HOST } from '../libs/constants'
import { generateMarkdown } from '../libs/generate-markdown'
import { GeneratedAction, TokenTrending } from '../models'
import { useAppStore } from '../stores/app'

type TokenTrendProps = {
  generatedAction: GeneratedAction
  action: () => void
}

export const TokenTrend = ({ generatedAction, action }: TokenTrendProps) => {
  const [setIsLoading, setIsShowingDetail] = useAppStore((state) => [state.setIsLoading, state.setIsShowingDetail])
  const [data, setData] = useState<TokenTrending | null>()

  useEffect(() => {
    const callMochi = async () => {
      setIsLoading(true)
      try {
        const url = `${MOCHI_HOST}${generatedAction?.endpoint}`
        const response = await axios.get<TokenTrending>(url)
        setData(response.data)
        setIsShowingDetail(true)
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Mochi is getting sick 🤒 while getting the token trend',
          message: String(error),
        })
      } finally {
        setIsLoading(false)
      }
    }

    generatedAction && callMochi()
  }, [generatedAction])

  return (
    <>
      {data ? (
        <List.Section title='🔥 These tokens are burning the chart'>
          {data.data.coins.map((coin) => (
            <List.Item
              key={coin.item.id}
              title={coin.item.name}
              subtitle={coin.item.symbol}
              icon={{
                source: coin.item.thumb,
                mask: Image.Mask.Circle,
              }}
              accessories={[
                {
                  tag: {
                    value: `#${(coin.item.score + 1).toString()}`,
                    color: coin.item.score < 3 ? Color.Yellow : Color.SecondaryText,
                  },
                  tooltip: 'Rank',
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title='Get answer' onAction={action} />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={generateMarkdown(coin.item.large, coin.item.name)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title='Name' />
                      <List.Item.Detail.Metadata.Label
                        title={`${coin.item.name} — ${coin.item.symbol}`}
                        icon={{
                          source: coin.item.thumb,
                          mask: Image.Mask.Circle,
                        }}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title='Rank' text={`#${(coin.item.score + 1).toString()}`} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title='Market Cap Rank'
                        text={`#${coin.item.market_cap_rank.toString()}`}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title='Price in BTC' text={coin.item.price_btc.toString()} />
                    </List.Item.Detail.Metadata>
                  }
                />
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
    </>
  )
}
