## Usage

Once configured, you can use all the available commands:

- **View Payments**: Browse and search through your payments
- **View Subscriptions**: Browse and manage recurring subscriptions
- **View Customers**: Browse and manage your customer database
- **View Products**: Browse and manage your product catalog
- **View Discount Codes**: Browse and manage your discount codes
- **View License Keys**: Browse and manage your license keys
- **View Disputes**: Browse and manage payment disputes
- **View Refunds**: Browse and manage payment refunds
- **View Payouts**: Browse and manage your payouts

## Troubleshooting

### Authentication Issues

If you see authentication errors:

1. Verify your API key is correct
2. Check that you're using the right environment (test vs live)
3. Ensure your API key has the necessary permissions
4. Try refreshing the command

### API Connection Issues

If you can't connect to the API:

1. Check your internet connection
2. Verify the API mode matches your key's environment
3. Contact Dodo Payments support if the issue persists

## Commands

### View Payments

Browse and manage your payments with comprehensive features:

- **Search**: Use the search bar to find specific payments by ID, customer, or amount
- **Status Icons**: Visual indicators for payment status (completed, pending, failed, refunded)
- **Payment Types**: Different badges for one-time payments, subscription payments, and refunds
- **Copy Actions**:
  - Copy payment ID (default action)
  - `Cmd + I`: Copy invoice link
  - `Cmd + E`: Copy customer email
- **Quick Actions**:
  - `Cmd + Shift + I`: Show invoice in browser
  - `Cmd + Shift + E`: Email customer
- **Formatted Display**: Amounts, dates, and payment methods are properly formatted
- **Infinite Scroll**: Efficiently browse through large payment lists

### View Subscriptions

Browse and manage recurring subscriptions:

- **Search**: Find subscriptions by customer name, plan, or subscription ID
- **Status Indicators**: Active, past due, canceled, paused subscriptions with color coding
- **Subscription Details**: Plan name, billing amount, billing cycle, and next billing date
- **Copy Actions**:
  - Copy subscription ID (default action)
  - `Cmd + E`: Copy customer email
- **Quick Actions**:
  - `Cmd + Shift + E`: Email customer
- **Customer Information**: View customer details and contact information
- **Infinite Scroll**: Handle large subscription lists efficiently

### View Customers

Browse and manage your customer database:

- **Search**: Find customers by name, email, or customer ID
- **Customer Overview**: View customer details, contact information, and metadata
- **Copy Actions**:
  - Copy customer ID (default action)
  - `Cmd + Shift + .`: Copy email address
  - `Cmd + Shift + P`: Copy phone number (if available)
- **Quick Actions**:
  - `Cmd + E`: Email customer
- **Formatted Display**: Clean presentation of customer data
- **Infinite Scroll**: Browse through large customer databases

### View Products

Browse and manage your product catalog:

- **Search**: Find products by name, description, or product ID
- **Product Details**: View pricing, descriptions, and product metadata
- **Copy Actions**:
  - Copy checkout URL (default action)
  - `Cmd + C`: Copy product ID
  - `Cmd + Shift + C`: Copy product name
- **Quick Actions**:
  - `Cmd + O`: Edit product in Dodo Payments
  - `Cmd + Shift + O`: Preview checkout page
- **Price Display**: Formatted pricing information
- **Infinite Scroll**: Handle large product catalogs

### View Discount Codes

Browse and manage your discount codes:

- **Search**: Find discount codes by code name or description
- **Discount Details**: View discount amounts, percentages, and validity periods
- **Status Indicators**: Active, expired, and usage-based discount tracking
- **Copy Actions**:
  - Copy discount code (default action)
  - `Cmd + Shift + Enter`: Copy discount ID
- **Usage Tracking**: See how many times codes have been used

### View License Keys

Browse and manage your license keys:

- **Search**: Find license keys by key value, customer, or product
- **Key Status**: Track active, expired, and revoked license keys
- **Copy Actions**:
  - Copy license key (default action)
  - `Cmd + Shift + .`: Copy license key ID
  - `Cmd + C`: Copy product ID
  - `Cmd + Shift + C`: Copy customer ID
- **Product Association**: See which products are associated with each key
- **Expiration Tracking**: Monitor license key expiration dates

### View Disputes

Browse and manage payment disputes:

- **Search**: Find disputes by payment ID, customer, or dispute reason
- **Status Tracking**: Monitor dispute status and resolution progress
- **Dispute Details**: View dispute amounts, reasons, and evidence
- **Copy Actions**:
  - Copy dispute ID (default action)
  - `Cmd + P`: Copy payment ID
- **Resolution Tracking**: Track dispute resolution timeline

### View Refunds

Browse and manage payment refunds:

- **Search**: Find refunds by payment ID, customer, or refund amount
- **Refund Status**: Track pending, completed, and failed refunds
- **Copy Actions**:
  - Copy refund ID (default action)
  - `Cmd + C`: Copy original payment ID
- **Amount Display**: View refund amounts and original payment amounts
- **Processing Status**: Monitor refund processing status

### View Payouts

Browse and manage your payouts:

- **Search**: Find payouts by payout ID, amount, or date range
- **Payout Status**: Track pending, completed, and failed payouts
- **Copy Actions**:
  - Copy payout ID (default action)
  - `Cmd + B`: Copy business ID
- **Quick Actions**:
  - `Cmd + D`: Show payout document (if available)
  - `Cmd + Shift + D`: Copy payout document URL (if available)
- **Banking Details**: View destination account information
- **Date Tracking**: Monitor payout dates and processing times
