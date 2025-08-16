# FreeAgent Raycast Extension

This Raycast extension allows you to interact with your FreeAgent account directly from Raycast, providing both traditional commands and AI-powered tools for financial analysis and management.

## Features

### Traditional Commands
- **List Invoices** - View and filter your invoices
- **List Tax Timeline** - See upcoming tax obligations  
- **List Timeslips** - View your time tracking entries
- **Create New Invoice** - Generate invoices through a form
- **Create Timeslip** - Log time entries
- **List Bank Transactions** - View all bank transactions
- **List Unexplained Transactions** - See transactions needing attention

### Error Handling
If you get a **422 error** "This transaction has already been fully explained":
1. The transaction is likely **marked for review** rather than unexplained
2. Use **update-bank-transaction-explanation** instead of **add-bank-transaction-explanation**
3. Use **list-bank-transaction-explanations** to find the explanation URLs

## Setup

1. Install the extension from the Raycast Store
2. Authenticate with your FreeAgent account using OAuth
3. Start using commands or AI tools with `@FreeAgent`

## Requirements

- Raycast Pro (for AI tools)
- Active FreeAgent account
- OAuth authentication with appropriate permissions

## Privacy & Security

- Uses OAuth 2.0 PKCE flow for secure authentication
- No data is stored locally beyond authentication tokens
- All API calls go directly to FreeAgent's servers