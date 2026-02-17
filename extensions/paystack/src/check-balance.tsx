import {
  showToast,
  Toast,
  List,
  ActionPanel,
  Action,
  openExtensionPreferences,
  Icon,
  launchCommand,
  LaunchType,
} from '@raycast/api'
import { useCachedPromise } from '@raycast/utils'
import { usePaystack } from './hooks/paystack'
import { useCurrencyFormatter } from './hooks/currency'
import { useActiveAccount } from './hooks/accounts'

export default function Command() {
  const formatCurrency = useCurrencyFormatter()
  const { account, isLoading: accountLoading } = useActiveAccount()
  const { get } = usePaystack(account)

  const { data: balances, isLoading } = useCachedPromise(
    async (_accountId: string) => {
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
    },
    [account?.id ?? ''] as [string],
    { execute: !!account },
  )

  return (
    <List
      isLoading={isLoading || accountLoading}
      searchBarPlaceholder="Search balances..."
      navigationTitle={account ? `Balances — ${account.name}` : 'Balances'}
    >
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
                onAction={() =>
                  launchCommand({
                    name: 'manage-accounts',
                    type: LaunchType.UserInitiated,
                  })
                }
                title="Switch Account"
                icon={Icon.Switch}
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
