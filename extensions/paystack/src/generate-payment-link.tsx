import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
} from '@raycast/api'
import { paystackDocsUrl } from './utils/urls'
import { useForm, FormValidation } from '@raycast/utils'
import { usePaystack } from './hooks/paystack'
import { SUPPORTED_CURRENCIES } from './data/supported-currencies'
import { useEffect } from 'react'
import { Currency, PaystackResponse } from './utils/types'

interface InitializeTransactionFormValues {
  amount: string
  email: string
  currency?: Currency
  reference?: string
  plan?: string
  callbackUrl?: string
}
export default function Command() {
  const { post, isLoading } = usePaystack()
  const { handleSubmit } = useForm<InitializeTransactionFormValues>({
    async onSubmit(values) {
      try {
        const initializeTransactionPayload = {
          amount: parseInt(values.amount) * 100,
          email: values.email,
          currency: values.currency,
          reference: values.reference,
          plan: values.plan,
          callback_url: values.callbackUrl,
        }
        const initializeTransaction = (await post('/transaction/initialize', {
          ...initializeTransactionPayload,
        })) as PaystackResponse<{
          status: boolean
          message: string
          authorization_url: string
        }>
        if (initializeTransaction.status) {
          Clipboard.copy(initializeTransaction.data.authorization_url).then(
            () => {
              showToast({
                style: Toast.Style.Success,
                title: 'Payment link generated and copied to clipboard',
              })
            },
          )
        }
      } catch (error) {
        console.error('Error generating payment link:', error)
        showToast({
          style: Toast.Style.Failure,
          title: 'Error generating payment link',
          message: (error as Error).message,
        })
      }
    },
    validation: {
      amount: FormValidation.Required,
      email: FormValidation.Required,
      reference: (value) => {
        if (value && !/^[a-zA-Z0-9_.=]+$/.test(value)) {
          return 'Only -, ., = and alphanumeric characters allowed'
        }
      },
      callbackUrl: (value) => {
        if (value && !/^https?:\/\/.+\..+/.test(value)) {
          return 'Invalid URL'
        }
      },
    },
  })

  useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: 'Generating payment link...',
      })
    }
  }, [isLoading])
  return (
    <Form
      searchBarAccessory={
        <Form.LinkAccessory
          target={`${paystackDocsUrl}/transaction/#initialize`}
          text="Initialize Transaction Docs"
        />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={handleSubmit}
            title="Generate Payment Link"
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a payment or subscription link for your customers." />
      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="Enter amount"
        info="The amount to be paid through this payment link."
      />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="Enter customer email"
        info="Customer's email address"
      />
      <Form.Separator />
      <Form.Dropdown
        id="currency"
        title="Currency"
        info="The transaction currency. Defaults to your integration currency."
      >
        {SUPPORTED_CURRENCIES.map((currency) => (
          <Form.Dropdown.Item
            key={currency}
            title={currency}
            value={currency}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="reference"
        title="Reference"
        placeholder="Enter transaction reference"
        info="Unique transaction reference. Only -, ., = and alphanumeric characters allowed."
      />
      <Form.TextField
        id="callbackUrl"
        title="Callback URL"
        placeholder="Enter callback URL"
        info="Fully qualified url, e.g. https://example.com/ . Use this to override the callback url provided on the dashboard for this transaction"
      />
      <Form.TextField
        id="plan"
        title="Plan"
        placeholder="Enter plan ID"
        info="The ID of the plan to subscribe the customer to. Only required if you are creating a subscription link."
      />
    </Form>
  )
}
