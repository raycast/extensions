import { ActionPanel, List, Action, Icon, Toast, showToast } from '@raycast/api'
import { paystackDashboardUrl } from './utils/urls'
import { useState, useMemo } from 'react'
import { usePaystack } from './hooks/paystack'
import { useDate } from './hooks/date'
import { useCurrencyFormatter } from './hooks/currency'
import { PaystackResponse, Plan } from './utils/types'
import { useCachedPromise } from '@raycast/utils'

export default function Command() {
  const { parseDate } = useDate()
  const formatCurrency = useCurrencyFormatter()
  const { get } = usePaystack()
  const [searchText, setSearchText] = useState<string>('')

  const { data: plans, isLoading } = useCachedPromise(async () => {
    const response = (await get('/plan')) as PaystackResponse<Plan[]>
    if (response.status) {
      showToast({
        style: Toast.Style.Success,
        title: 'Plans fetched successfully!',
      })
    }
    return response.data
  })

  const filteredPlans = useMemo(() => {
    if (!plans) return []
    const searchLower = searchText.toLowerCase()
    return plans.filter((plan) => {
      return (
        plan.name.toLowerCase().includes(searchLower) ||
        plan.plan_code.toLowerCase().includes(searchLower) ||
        plan.description?.toLowerCase().includes(searchLower)
      )
    })
  }, [searchText, plans])

  return (
    <List
      searchBarPlaceholder="Search plans by name or plan code"
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
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
