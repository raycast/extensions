import {
  showToast,
  Toast,
  List,
  ActionPanel,
  Action,
  openExtensionPreferences,
  Icon,
} from '@raycast/api'
import { useCachedPromise } from '@raycast/utils'
import { usePaystack } from './hooks/paystack'
import { useCurrencyFormatter } from './hooks/currency'

export default function Command() {
  const formatCurrency = useCurrencyFormatter()
  const { get } = usePaystack()

  const { data: balances, isLoading } = useCachedPromise(async () => {
    const response = (await get('/balance')) as {
      status: boolean
      message: string
      data: { currency: string; balance: number }[]
    }
    if (response.status) {
      showToast({
        style: Toast.Style.Success,
        title: 'Balances fetched successfully!',
      })
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to fetch balances',
        message: response.message,
      })
    }
    return response.data
  })

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search balances...">
      {(balances || []).map((balance, index) => (
        <List.Item
          key={index}
          title={formatCurrency(balance.balance, balance.currency)}
          subtitle={balance.currency}
          icon={Icon.Wallet}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://dashboard.paystack.com/#/dashboard?currency=${balance.currency}`}
                shortcut={{
                  modifiers: ['cmd'],
                  key: 'o',
                }}
                title="Open in Dashboard"
              />
              <Action.CopyToClipboard
                title="Copy Balance"
                content={formatCurrency(balance.balance, balance.currency)}
                shortcut={{ modifiers: ['cmd'], key: 'c' }}
              />
              <Action
                onAction={openExtensionPreferences}
                title={'Open Preferences'}
                icon={Icon.Gear}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
