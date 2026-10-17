# Moneytree

View and manage your financial data from
[Moneytree](https://getmoneytree.com/jp/home) directly in Raycast.
Quick access to credentials, accounts, balances, transactions, and categories
without leaving your workflow.

## Features

### List Credentials

View all your connected financial institutions grouped by type:
Banks, Credit Cards, Investments, Digital Money, Points, and Others.
Each credential shows the total balance across its accounts.
Filter by type using the dropdown.

### List Accounts

Browse individual accounts grouped by credential/institution.
Each account shows its type and current balance.
Filter by credential using the dropdown.

### List Transactions

Search and browse transactions grouped by month. Transactions show
the day of the month, a category icon, description, account name,
and amount (color-coded for income/expense).

- **Search**: Type in the search bar to search server-side across
  6 months of transactions
- **Filter**: Use the account dropdown to filter by account
- **Launch Argument**: Pre-fill a search query before opening
- **Pagination**: Scroll down to automatically load more
- **Edit**: Update a transaction's custom description or category

### List Categories

Browse Moneytree categories grouped by parent category. The filter
defaults to **Custom** and can switch between Custom, All, and
Built-in categories. Create a custom child category from any parent
category, or from an existing child category under the same parent.
Edit custom category names, parent categories, and icons.

### List Budgets

View synced category budget **limits** by name. Press Enter to edit a saved limit, create a new limit for an expense category without one, or delete a limit after a confirmation. Writes re-read the saved budgets to check the result. This does not show spending or remaining budget; it does not reconcile household reimbursements, credit card settlements, or prepaid card top-ups.

### Ask Moneytree

Ask Raycast AI about your Moneytree data using the extension's tools:

- Search transactions by merchant, date range, account, or description
- Inspect credentials, account balances, and connection status
- Browse Moneytree categories and custom subcategories
- Update specific transactions' descriptions or categories
- Create custom subcategories under existing Moneytree categories
- List category budget limits and create, update, or delete them on explicit request

AI tools that update transactions, categories, or budgets mutate your
Moneytree data. Suggestions and budget plans alone do not save limits.
Budget management uses Moneytree endpoints identified from its Android app;
these are not a documented public API and may change. The budget response
contains saved category limits, not spending progress or remaining balances.

## Setup

1. Install the extension
2. Set your Moneytree email and password in extension preferences
3. Enable "Auto Re-login" (recommended) to keep the session alive

## Security

- **Encrypted credentials**: Email and password are stored in
  Raycast preferences, secured by your system Keychain (macOS)
  or Credential Manager (Windows)
- **Secure tokens**: OAuth tokens are encrypted in system-level
  secure storage
- **Direct communication**: All API calls go directly to
  Moneytree servers — no third-party services involved
- **Limited writes**: The extension can update transaction
  descriptions/categories, create or edit custom subcategories, and manage category budget limits
- **Local caching**: Data is cached locally and expires after
  a few minutes
- **No data collection**: Nothing is collected or shared — your
  information stays between you and Moneytree
- **Open source**: The source code is available for review

## Disclaimer

This is not an official Moneytree product. It is an independent,
open-source project not affiliated with, endorsed by, or supported
by Moneytree. Use at your own risk. Moneytree may change their API
at any time, which could break this extension.

## License

MIT
