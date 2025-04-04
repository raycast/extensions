import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  openExtensionPreferences,
} from '@raycast/api'

import { useEffect, useState } from 'react'
import { usePaystack } from './hooks/paystack'
import { useCurrencyFormatter } from './hooks/currency'
import { useDate } from './hooks/date'
import { Currency, PaystackResponse } from './utils/types'
import { paystackDashboardUrl } from './utils/urls'

interface Payout {
  id: number
  domain: string
  status: string
  currency: Currency
  integration: number
  total_amount: number
  effective_amount: number
  total_fees: number
  total_processed: number
  deductions: null | string
  settlement_date: string
  settled_by: null | string
  createdAt: string
  updatedAt: string
}
export default function Command() {
  const formatCurrency = useCurrencyFormatter()
  const { parseDate } = useDate()
  const { get, isLoading } = usePaystack()
  const [payouts, setPayouts] = useState<Array<Payout>>([])
  const [filteredPayouts, setFilteredPayouts] = useState<Array<Payout>>([])
  const [searchText, setSearchText] = useState<string>('')
  const [currentStatus, setCurrentStatus] = useState<string>('all')

  useEffect(() => {
    async function getPayouts() {
      try {
        const payouts = (await get('/settlement')) as PaystackResponse<Payout[]>
        if (payouts.status) {
          showToast({
            style: Toast.Style.Success,
            title: 'Payouts fetched successfully!',
          })
        }
        setPayouts(payouts.data)
        setFilteredPayouts(payouts.data)
      } catch (error) {
        console.error('Error fetching payouts:', error)
        showToast({
          style: Toast.Style.Failure,
          title: 'Error fetching payouts',
          message: (error as Error).message,
        })
        setPayouts([])
        setFilteredPayouts([])
      }
    }
    getPayouts()
  }, [])

  useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: 'Loading payouts...',
      })
    }
  }, [isLoading])

  const filterPayouts = (text: string, status: string) => {
    const searchLower = text.toLowerCase()
    return payouts.filter((payout) => {
      const matchesSearch =
        payout.id.toString().includes(searchLower) ||
        payout.currency?.includes(searchLower)

      const matchesStatus = status === 'all' || payout.status === status

      return matchesSearch && matchesStatus
    })
  }

  useEffect(() => {
    setFilteredPayouts(filterPayouts(searchText, currentStatus))
  }, [searchText, currentStatus, payouts])

  function onStatusChange(status: string) {
    setCurrentStatus(status)
  }

  return (
    <List
      searchBarPlaceholder="Search payouts by ID, currency, or, status."
      onSearchTextChange={setSearchText}
      searchBarAccessory={StatusDropdown(onStatusChange)}
    >
      {filteredPayouts.map((payout) => (
        <List.Item
          key={payout.id}
          title={`${
            payout.status === 'success'
              ? 'Paid out'
              : payout.status === 'pending'
                ? 'Payout pending'
                : payout.status === 'processing'
                  ? 'Payout processing'
                  : 'Payout attempted'
          } ${formatCurrency(payout.total_amount, payout.currency)}`}
          subtitle={payout.id.toString()}
          accessories={[
            {
              text: `+${formatCurrency(payout.total_processed, payout.currency)}`,
            },
            {
              text: `-${formatCurrency(payout.total_fees, payout.currency)}`,
            },
            {
              icon:
                payout.status === 'success'
                  ? Icon.CheckCircle
                  : payout.status === 'pending'
                    ? Icon.CircleProgress25
                    : payout.status === 'processing'
                      ? Icon.CircleProgress50
                      : Icon.XMarkCircle,
              text: payout.status,
            },
            {
              text: payout.settlement_date
                ? parseDate(payout.settlement_date)
                : null,
            },
          ]}
          icon={Icon.Coins}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`${paystackDashboardUrl}/payouts/${payout.id}`}
                title="View in Dashboard"
              />
              <Action.CopyToClipboard
                title="Copy ID"
                content={payout.id.toString()}
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
          title="Success"
          value="success"
          icon={Icon.CheckCircle}
        />
        <List.Dropdown.Item
          title="Processing"
          value="processing"
          icon={Icon.CircleProgress50}
        />
        <List.Dropdown.Item
          title="Pending"
          value="pending"
          icon={Icon.CircleProgress25}
        />
        <List.Dropdown.Item
          title="Failed"
          value="failed"
          icon={Icon.XMarkCircle}
        />
      </List.Dropdown.Section>
    </List.Dropdown>
  )
}
