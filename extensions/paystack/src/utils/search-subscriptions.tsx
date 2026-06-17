import { ActionPanel, List, Action, Icon, Toast, showToast } from '@raycast/api'
import { paystackDashboardUrl } from './urls'
import { useEffect, useState } from 'react'
import { usePaystack } from '../hooks/paystack'
import { useDate } from '../hooks/date'
import { useCurrencyFormatter } from '../hooks/currency'
import { PaystackResponse, Subscription } from './types'

export default function Command() {
  const { parseDate } = useDate()
  const formatCurrency = useCurrencyFormatter()
  const { get, isLoading } = usePaystack()
  const [subscriptions, setSubscriptions] = useState<Array<Subscription>>([])
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<
    Array<Subscription>
  >([])
  const [searchText, setSearchText] = useState<string>('')
  const [currentStatus, setCurrentStatus] = useState<string>('all')

  useEffect(() => {
    async function getSubscriptions() {
      try {
        const subscriptions = (await get('/subscription')) as PaystackResponse<
          Subscription[]
        >
        if (subscriptions.status) {
          showToast({
            style: Toast.Style.Success,
            title: 'Subscriptions fetched successfully!',
          })
        }
        setSubscriptions(subscriptions.data)
        setFilteredSubscriptions(subscriptions.data)
      } catch (error) {
        console.error('Error fetching subscriptions:', error)
        showToast({
          style: Toast.Style.Failure,
          title: 'Error fetching subscriptions',
          message: (error as Error).message,
        })
        setSubscriptions([])
        setFilteredSubscriptions([])
      }
    }
    getSubscriptions()
  }, [])

  const filterSubscriptions = (text: string, status: string) => {
    const searchLower = text.toLowerCase()
    return subscriptions.filter((subscription) => {
      const matchesSearch =
        subscription.customer.email.toLowerCase().includes(searchLower) ||
        subscription.subscription_code.toLowerCase().includes(searchLower) ||
        subscription.plan.name.toLowerCase().includes(searchLower)

      const matchesStatus = status === 'all' || subscription.status === status

      return matchesSearch && matchesStatus
    })
  }

  useEffect(() => {
    setFilteredSubscriptions(filterSubscriptions(searchText, currentStatus))
  }, [searchText, currentStatus, subscriptions])

  function onStatusChange(status: string) {
    setCurrentStatus(status)
  }
  useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: 'Loading subscriptions...',
      })
    }
  }, [isLoading])

  return (
    <List
      searchBarPlaceholder="Search subscriptions by email, code or plan name"
      onSearchTextChange={setSearchText}
      searchBarAccessory={StatusDropdown(onStatusChange)}
    >
      {filteredSubscriptions.map((subscription) => (
        <List.Item
          key={subscription.id}
          title={`${subscription.customer.email} - ${subscription.plan.name}`}
          subtitle={subscription.subscription_code}
          icon={Icon.Calendar}
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
              text: `Next payment: ${parseDate(subscription.next_payment_date)}`,
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
