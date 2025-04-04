import { ActionPanel, List, Action, Icon, Toast, showToast } from '@raycast/api'
import { paystackDashboardUrl } from './utils/urls'

import { useEffect, useState } from 'react'
import { usePaystack } from './hooks/paystack'
import { useDate } from './hooks/date'
import { PaystackResponse } from './utils/types'

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  metadata: {
    [key: string]: string
  }
  risk_action: string
  customer_code: string
  integration: string
  createdAt: string
  updatedAt: string
}
export default function Command() {
  const { parseDate } = useDate()
  const { get, isLoading } = usePaystack()
  const [customers, setCustomers] = useState<Array<Customer>>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Array<Customer>>(
    [],
  )
  const [searchText, setSearchText] = useState<string>('')
  useEffect(() => {
    async function getTransactions() {
      try {
        const customers = (await get('/customer')) as PaystackResponse<
          Customer[]
        >
        if (customers.status) {
          showToast({
            style: Toast.Style.Success,
            title: 'Customers fetched successfully!',
          })
        }
        setCustomers(customers.data)
        setFilteredCustomers(customers.data)
      } catch (error) {
        console.error('Error fetching customers:', error)
        showToast({
          style: Toast.Style.Failure,
          title: 'Error fetching customers',
          message: (error as Error).message,
        })
        setCustomers([])
        setFilteredCustomers([])
      }
    }
    getTransactions()
  }, [])

  useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: 'Loading customers...',
      })
    }
  }, [isLoading])

  function filterCustomers(text: string) {
    const searchLower = text.toLowerCase()
    return customers.filter((customer) => {
      const matchesSearch =
        customer.id.toString().includes(searchLower) ||
        customer.customer_code.includes(searchLower) ||
        customer.email.includes(searchLower) ||
        customer.first_name.includes(searchLower) ||
        customer.last_name.includes(searchLower)
      return matchesSearch
    })
  }

  useEffect(() => {
    setFilteredCustomers(filterCustomers(searchText))
  }, [searchText, customers])

  return (
    <List onSearchTextChange={setSearchText}>
      {filteredCustomers.map((customer) => (
        <List.Item
          key={customer.id}
          title={
            customer.first_name && customer.last_name
              ? `${customer?.first_name} ${customer?.last_name}`
              : ''
          }
          subtitle={customer.email}
          icon={Icon.Person}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`${paystackDashboardUrl}/customers/${customer.customer_code}`}
                title="View Customer in Dashboard"
              />
              <Action.CopyToClipboard
                content={customer.id}
                title="Copy Customer ID"
              />
              <Action.CopyToClipboard
                content={customer.customer_code}
                title="Copy Customer Code"
              />
              <Action.CopyToClipboard
                content={customer.email}
                title="Copy Customer Email"
              />
            </ActionPanel>
          }
          accessories={[
            {
              text: parseDate(customer.createdAt),
            },
            {
              text: customer.customer_code,
            },
          ]}
        />
      ))}
    </List>
  )
}
