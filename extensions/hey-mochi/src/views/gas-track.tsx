import { Action, ActionPanel, Icon, List, showToast, Toast } from '@raycast/api'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { MOCHI_HOST } from '../libs/constants'
import { GasTrackerInfomation, GeneratedAction } from '../models'
import { useAppStore } from '../stores/app'

type TokenTrendProps = {
  generatedAction: GeneratedAction
  action: () => void
}

export const GasTrack = ({ generatedAction, action }: TokenTrendProps) => {
  const [setIsLoading, setIsShowingDetail] = useAppStore((state) => [state.setIsLoading, state.setIsShowingDetail])
  const [data, setData] = useState<GasTrackerInfomation | null>()

  useEffect(() => {
    const callMochi = async () => {
      setIsLoading(true)
      try {
        const url = `${MOCHI_HOST}${generatedAction?.endpoint}`
        const response = await axios.get<GasTrackerInfomation>(url)
        setData(response.data)
        setIsShowingDetail(false)
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Mochi is getting sick 🤒 while getting the gas fee',
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
        <List.Section title='💸 Keep an eye on gas fee'>
          {data.data.map((gas) => (
            <List.Item
              key={gas.chain}
              title={gas.chain}
              accessories={[
                { text: { value: `🐢 ${gas.safe_gas_price} Gwei` }, tooltip: 'Normal' },
                { text: { value: `⚡️ ${gas.fast_gas_price} Gwei` }, tooltip: 'Fast' },
              ]}
              actions={
                <ActionPanel>
                  <Action title='Get answer' onAction={action} />
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
    </>
  )
}
