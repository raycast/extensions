import { Action, ActionPanel, Icon, List, showToast, Toast } from '@raycast/api'
import axios, { AxiosResponse } from 'axios'
import { useEffect, useState } from 'react'
import { MOCHI_HOST } from '../libs/constants'
import { generateMarkdown } from '../libs/generate-markdown'
import { ChainInfomation, ChainInformationWithTokenInformation, GeneratedAction, TokenInfomation } from '../models'
import { useAppStore } from '../stores/app'

type TokenTrendProps = {
  generatedAction: GeneratedAction
  action: () => void
}

export const ChainInfo = ({ generatedAction, action }: TokenTrendProps) => {
  const [setIsLoading, setIsShowingDetail] = useAppStore((state) => [state.setIsLoading, state.setIsShowingDetail])
  const [data, setData] = useState<ChainInformationWithTokenInformation[] | null>()

  useEffect(() => {
    const callMochi = async () => {
      setIsLoading(true)
      try {
        const url = `${MOCHI_HOST}${generatedAction?.endpoint}`
        const response = await axios.get<ChainInfomation>(url)
        const chainData = response.data
        const apiCalls = chainData.data.map((url) =>
          axios.get(`${MOCHI_HOST}/defi/coins/${url.coin_gecko_id.toLowerCase()}`),
        )

        const results = await Promise.allSettled(apiCalls)

        const successfulResponses = results.filter(
          (result) => result.status === 'fulfilled',
        ) as PromiseFulfilledResult<AxiosResponse>[]

        const tokenResponses = successfulResponses.map((response) => response.value.data) as TokenInfomation[]

        const data: ChainInformationWithTokenInformation[] = chainData.data.map((chain) => {
          const filtered = tokenResponses.filter((token) => token.data.symbol === chain.short_name)
          return {
            ...chain,
            token: filtered.length > 0 ? filtered[0].data : undefined,
          }
        })

        setData(data)
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
        <List.Section title='⛓ Mochi support these chains'>
          {data.map((chain) => (
            <List.Item
              key={chain.id}
              title={chain.name}
              subtitle={chain.currency}
              actions={
                <ActionPanel>
                  <Action title='Get answer' onAction={action} />
                </ActionPanel>
              }
              detail={
                <>
                  {chain.token && (
                    <List.Item.Detail
                      markdown={generateMarkdown(chain.token.image.large, chain.name)}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title='Name' />
                          <List.Item.Detail.Metadata.Label
                            title={`${chain.name} — ${chain.short_name.toUpperCase()}`}
                          />

                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title='Market Cap Rank'
                            text={`#${chain.token.market_cap_rank.toString()}`}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title='Current Price' />
                          {Object.entries(chain.token.market_data.current_price).map(([key, value]) => (
                            <List.Item.Detail.Metadata.Label
                              key={key}
                              title={`${chain.short_name.toUpperCase()}/${key.toUpperCase()}`}
                              text={value.toString()}
                            />
                          ))}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  )}
                </>
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
