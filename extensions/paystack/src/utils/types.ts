export interface Customer {
  id: number
  email: string
  first_name?: string
  last_name?: string
  phone?: string
}

export interface Balance {
  currency: string
  balance: number
}
export interface TransactionLog {
  start_time: number
  time_spent: number
  attempts: number
  errors: number
  success: boolean
  mobile: boolean
  input: object[]
  history: {
    type: string
    message: string
    time: number
  }[]
}

export interface CustomerMetadata {
  custom_fields: {
    display_name: string
    variable_name: string
    value: string
  }[]
}

export interface ExtendedCustomer extends Customer {
  metadata?: CustomerMetadata
  customer_code: string
  risk_action: string
}

export interface Authorization {
  authorization_code: string
  bin: string
  last4: string
  exp_month: string
  exp_year: string
  channel: string
  card_type: string
  bank: string
  country_code: string
  brand: string
  reusable: boolean
  signature: string
  account_name?: string | null
}

export interface Source {
  source: string
  type: string
  identifier?: string | null
  entry_point: string
}

export interface Transaction {
  id: number
  domain: string
  status: string
  reference: string
  amount: number
  message?: string | null
  gateway_response: string
  paid_at: string
  channel: string
  currency: string
  ip_address: string
  metadata?: object | null
  log?: TransactionLog
  fees: number
  fees_split?: object | null
  customer: ExtendedCustomer
  authorization?: Authorization
  plan?: object
  split?: object
  subaccount?: object
  order_id?: string | null
  paidAt: string
  createdAt: string
  requested_amount: number
  source: Source
  connect?: object | null
  pos_transaction_data?: object | null
}
export interface PaystackResponse<T> {
  status: boolean
  message: string
  data: T
}
export type Currency = 'NGN' | 'USD' | 'GHS' | 'ZAR' | 'KES'

export interface Subscription {
  customer: Customer
  plan: Plan
  authorization: {
    authorization_code: string
    bin: string
    last4: string
    exp_month: string
    exp_year: string
    channel: string
    card_type: string
    bank: string
    country_code: string
    brand: string
    reusable: boolean
    signature: string
    account_name: string
  }
  status: 'active' | 'cancelled'
  subscription_code: string
  email_token: string
  amount: number
  next_payment_date: string
  createdAt: string
  updatedAt: string
  id: number
}

export interface Plan {
  id: number
  name: string
  plan_code: string
  description: string | null
  amount: number
  interval: string
  currency: Currency
  subscriptions: Subscription[]
  createdAt: string
  updatedAt: string
}
