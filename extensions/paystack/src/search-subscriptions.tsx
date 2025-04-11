import { ActionPanel, List, Action, Icon, Toast, showToast } from '@raycast/api'
import { paystackDashboardUrl } from './utils/urls'
import { useState, useMemo } from 'react'
import { usePaystack } from './hooks/paystack'
import { useDate } from './hooks/date'
import { useCurrencyFormatter } from './hooks/currency'
import { PaystackResponse, Subscription } from './utils/types'
import { useCachedPromise } from '@raycast/utils'

export default function Command() {
  const { parseDate } = useDate()
  const formatCurrency = useCurrencyFormatter()
  const { get } = usePaystack()
  const [searchText, setSearchText] = useState<string>('')
  const [currentStatus, setCurrentStatus] = useState<string>('all')

  const { data: subscriptions, isLoading } = useCachedPromise(async () => {
    const response = (await get('/subscription')) as PaystackResponse<
      Subscription[]
    >
    if (response.status) {
      showToast({
        style: Toast.Style.Success,
        title: 'Subscriptions fetched successfully!',
      })
    }
    return response.data
  })

  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions) return []
    const searchLower = searchText.toLowerCase()
    return subscriptions.filter((subscription) => {
      const matchesSearch =
        subscription.customer.email.toLowerCase().includes(searchLower) ||
        subscription.subscription_code.toLowerCase().includes(searchLower) ||
        subscription.plan.name.toLowerCase().includes(searchLower)

      const matchesStatus =
        currentStatus === 'all' || subscription.status === currentStatus

      return matchesSearch && matchesStatus
    })
  }, [searchText, currentStatus, subscriptions])

  function onStatusChange(status: string) {
    setCurrentStatus(status)
  }

  return (
    <List
      searchBarPlaceholder="Search subscriptions by email, code or plan name"
      onSearchTextChange={setSearchText}
      searchBarAccessory={StatusDropdown(onStatusChange)}
      isLoading={isLoading}
    >
      {filteredSubscriptions.map((subscription) => (
        <List.Item
          key={subscription.id}
          title={subscription.customer.email}
          subtitle={subscription.plan.name}
          icon={Icon.AddPerson}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`${paystackDashboardUrl}/subscriptions/${subscription.id}`}
                title="View in Dashboard"
              />
              <Action.CopyToClipboard
                title="Copy Subscription Code"
                content={subscription.subscription_code}
              />
            </ActionPanel>
          }
          accessories={[
            {
              icon:
                subscription.status === 'active'
                  ? Icon.CheckCircle
                  : Icon.XMarkCircle,
              text: subscription.status,
            },
            {
              text: formatCurrency(
                subscription.amount,
                subscription.plan.currency,
              ),
            },
            {
              text: parseDate(subscription.createdAt),
            },
          ]}
        />
      ))}
    </List>
  )
}

function StatusDropdown(onStatusChange: (status: string) => void) {
  return (
    <List.Dropdown
      tooltip="Status"
      storeValue
      onChange={(newValue) => onStatusChange(newValue)}
    >
      <List.Dropdown.Section title="Status">
        <List.Dropdown.Item title="All" value="all" icon={Icon.Coins} />
        <List.Dropdown.Item
          title="Active"
          value="active"
          icon={Icon.CheckCircle}
        />
        <List.Dropdown.Item
          title="Cancelled"
          value="cancelled"
          icon={Icon.XMarkCircle}
        />
      </List.Dropdown.Section>
    </List.Dropdown>
  )
}
