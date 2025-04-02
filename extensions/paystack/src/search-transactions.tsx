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
import { Currency, PaystackResponse, Transaction } from './utils/types'
import { paystackDashboardUrl } from './utils/urls'

import IssueRefund from './issue-refund'
export default function Command() {
  const formatCurrency = useCurrencyFormatter()
  const { parseDate } = useDate()
  const { get, isLoading } = usePaystack()
  const [transactions, setTransactions] = useState<Array<Transaction>>([])
  const [filteredTransactions, setFilteredTransactions] = useState<
    Array<Transaction>
  >([])
  const [searchText, setSearchText] = useState<string>('')
  const [currentStatus, setCurrentStatus] = useState<string>('all')

  useEffect(() => {
    async function getTransactions() {
      try {
        const transactions = (await get('/transaction')) as PaystackResponse<
          Transaction[]
        >
        if (transactions.status) {
          showToast({
            style: Toast.Style.Success,
            title: 'Transactions fetched successfully!',
          })
        }
        setTransactions(transactions.data)
        setFilteredTransactions(transactions.data)
      } catch (error) {
        console.error('Error fetching transactions:', error)
        showToast({
          style: Toast.Style.Failure,
          title: 'Error fetching transactions',
          message: (error as Error).message,
        })
        setTransactions([])
        setFilteredTransactions([])
      }
    }
    getTransactions()
  }, [])

  useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: 'Loading transactions...',
      })
    }
  }, [isLoading])

  const filterTransactions = (text: string, status: string) => {
    const searchLower = text.toLowerCase()
    return transactions.filter((transaction) => {
      const matchesSearch =
        transaction.id.toString().includes(searchLower) ||
        transaction.reference.includes(searchLower) ||
        transaction.customer?.email?.includes(searchLower)

      const matchesStatus = status === 'all' || transaction.status === status

      return matchesSearch && matchesStatus
    })
  }

  useEffect(() => {
    setFilteredTransactions(filterTransactions(searchText, currentStatus))
  }, [searchText, currentStatus, transactions])

  function onStatusChange(status: string) {
    setCurrentStatus(status)
  }

  return (
    <List
      searchBarPlaceholder="Search transactions by ID, reference, or email"
      onSearchTextChange={setSearchText}
      searchBarAccessory={StatusDropdown(onStatusChange)}
    >
      {filteredTransactions.map((transaction) => (
        <List.Item
          key={transaction.id}
          title={`${transaction.customer?.email} ${transaction.status == 'success' ? 'paid you' : 'tried to pay you'} ${formatCurrency(transaction.amount, transaction.currency)}`}
          subtitle={transaction.id.toString()}
          accessories={[
            {
              icon:
                transaction.status === 'success'
                  ? Icon.CheckCircle
                  : Icon.XMarkCircle,
              text: transaction.status,
            },
            {
              text: transaction.paidAt ? parseDate(transaction?.paidAt) : null,
            },
          ]}
          icon={Icon.Coins}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`${paystackDashboardUrl}/transactions/${transaction.id}/analytics`}
                title="View in Dashboard"
              />
              <Action.CopyToClipboard
                title="Copy ID"
                content={transaction.id.toString()}
              />
              <Action.CopyToClipboard
                title="Copy Reference"
                content={transaction.reference}
              />
              <Action.Push
                target={
                  <IssueRefund
                    transactionId={transaction.id.toString()}
                    currency={transaction.currency as Currency}
                  />
                }
                title="Issue Refund"
                icon={Icon.Coin}
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
          title="Failed"
          value="failed"
          icon={Icon.XMarkCircle}
        />
        <List.Dropdown.Item
          title="Abandoned"
          value="abandoned"
          icon={Icon.XMarkCircleHalfDash}
        />
      </List.Dropdown.Section>
    </List.Dropdown>
  )
}
