# Moneytree

View your financial data from
[Moneytree](https://getmoneytree.com/jp/home) directly in Raycast.
Quick access to credentials, accounts, balances, and transactions
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
- **Read-only**: The extension only views data — no transfers,
  payments, or modifications
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
