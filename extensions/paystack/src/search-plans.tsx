import { ActionPanel, List, Action, Icon, Toast, showToast } from '@raycast/api'
import { paystackDashboardUrl } from './utils/urls'
import { useEffect, useState } from 'react'
import { usePaystack } from './hooks/paystack'
import { useDate } from './hooks/date'
import { useCurrencyFormatter } from './hooks/currency'
import { PaystackResponse, Plan } from './utils/types'

export default function Command() {
  const { parseDate } = useDate()
  const formatCurrency = useCurrencyFormatter()
  const { get, isLoading } = usePaystack()
  const [plans, setPlans] = useState<Array<Plan>>([])
  const [filteredPlans, setFilteredPlans] = useState<Array<Plan>>([])
  const [searchText, setSearchText] = useState<string>('')

  useEffect(() => {
    async function getPlans() {
      try {
        const plans = (await get('/plan')) as PaystackResponse<Plan[]>
        if (plans.status) {
          showToast({
            style: Toast.Style.Success,
            title: 'Plans fetched successfully!',
          })
        }
        setPlans(plans.data)
        setFilteredPlans(plans.data)
      } catch (error) {
        console.error('Error fetching plans:', error)
        showToast({
          style: Toast.Style.Failure,
          title: 'Error fetching plans',
          message: (error as Error).message,
        })
        setPlans([])
        setFilteredPlans([])
      }
    }
    getPlans()
  }, [])

  useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: 'Loading plans...',
      })
    }
  }, [isLoading])

  function filterPlans(text: string) {
    const searchLower = text.toLowerCase()
    return plans.filter((plan) => {
      return (
        plan.name.toLowerCase().includes(searchLower) ||
        plan.plan_code.toLowerCase().includes(searchLower) ||
        plan.description?.toLowerCase().includes(searchLower)
      )
    })
  }

  useEffect(() => {
    setFilteredPlans(filterPlans(searchText))
  }, [searchText, plans])

  return (
    <List
      searchBarPlaceholder="Search plans by name or plan code"
      onSearchTextChange={setSearchText}
    >
      {filteredPlans.map((plan) => (
        <List.Item
          key={plan.id}
          title={plan.name}
          subtitle={formatCurrency(plan.amount, plan.currency)}
          icon={Icon.Calendar}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`${paystackDashboardUrl}/plans/${plan.id}/subscriptions`}
                title="View Subscriptions"
              />
              <Action.CopyToClipboard
                content={plan.id.toString()}
                title="Copy Plan ID"
              />
              <Action.CopyToClipboard
                content={plan.plan_code}
                title="Copy Plan Code"
              />
            </ActionPanel>
          }
          accessories={[
            { text: `${plan.subscriptions.length} subscriptions` },
            { text: plan.interval },
            { text: parseDate(plan.createdAt) },
          ]}
        />
      ))}
    </List>
  )
}
