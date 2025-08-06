# Freeagent Raycast Extension

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

### AI-Powered Tools
Use natural language with `@freeagent` to interact with your financial data:

#### 🔍 **find-invoice**
Find specific invoices using natural language search:
- `@freeagent find invoice for ABC Company`
- `@freeagent show me invoices for £150`
- `@freeagent find overdue invoices from last month`

#### 📊 **analyze-financials** 
Get comprehensive financial insights:
- `@freeagent show me my financial overview`
- `@freeagent analyze my overdue invoices`
- `@freeagent what's my payment rate?`

#### 📝 **create-invoice-ai**
Create invoices using natural language (with confirmation):
- `@freeagent create invoice for John Smith for £500 consulting work`
- `@freeagent bill ABC Company £1200 for web development`

#### 💳 **categorize-transactions**
Analyze bank transactions and spending patterns:
- `@freeagent analyze my spending patterns`
- `@freeagent show me unexplained transactions`
- `@freeagent categorize my expenses by type`

#### 👥 **client-insights**
Understand client relationships and payment behavior:
- `@freeagent show me client insights for ABC Company`
- `@freeagent who are my top paying clients?`
- `@freeagent analyze payment patterns`

#### 💰 **cash-flow-summary**
Get cash flow analysis and projections:
- `@freeagent what's my cash flow looking like?`
- `@freeagent show me monthly cash flow trends`
- `@freeagent project my upcoming payments`

#### 🔍 **explain-transactions**
Get intelligent explanations for unexplained bank transactions:
- `@freeagent explain my unexplained transactions`
- `@freeagent help me understand this £500 transaction`
- `@freeagent analyze transactions needing explanation`

#### 🔎 **search-explained-transactions**
Search through historical explained transactions for patterns:
- `@freeagent search for explained transactions from ABC Company`
- `@freeagent find previous software subscription payments`
- `@freeagent show me explained travel expenses`

#### 📎 **match-file-to-transaction**
Match files to transactions and suggest explanations:
- `@freeagent match invoice file 'Invoice_500.pdf' with amount £500`
- `@freeagent attach receipt for £25 coffee expense from today`
- `@freeagent help me link this contract to a transaction`

## Bank Transaction Explanation Workflow

### Understanding Transaction Types
FreeAgent categorizes bank transactions into different states:

- **Unexplained**: Transactions that have no explanation yet
- **Marked for Review**: Transactions with auto-generated explanations that need user approval
- **Explained**: Transactions with approved explanations

### Tools for Different Transaction States

#### ✅ **add-bank-transaction-explanation** (For Unexplained Transactions)
Use this tool for transactions that have no explanation:
- `@freeagent add explanation for transaction [URL] as office supplies for £50`
- Creates a new explanation for the transaction
- Used when the transaction has never been explained

#### ✏️ **update-bank-transaction-explanation** (For Marked for Review Transactions)  
Use this tool for transactions that already have auto-generated explanations:
- `@freeagent update explanation [URL] to change description to 'updated office supplies'`
- Modifies existing explanations and clears the "marked for review" status
- Used when FreeAgent has automatically categorized a transaction but it needs correction

#### 📎 **upload-attachment**
Upload files (receipts, invoices) to attach to explanations:
- `@freeagent upload receipt file receipt.pdf`
- Returns an attachment URL that can be used with explanation tools
- Supports PDF, JPEG, PNG, CSV and other common file types

#### 📋 **list-bank-transaction-explanations**
Find explanation URLs for the update tool:
- `@freeagent list explanations for marked for review transactions`
- Helps identify which transactions need updates vs new explanations

### Error Handling
If you get a **422 error** "This transaction has already been fully explained":
1. The transaction is likely **marked for review** rather than unexplained
2. Use **update-bank-transaction-explanation** instead of **add-bank-transaction-explanation**
3. Use **list-bank-transaction-explanations** to find the explanation URLs

## Setup

1. Install the extension from the Raycast Store
2. Authenticate with your FreeAgent account using OAuth
3. Start using commands or AI tools with `@freeagent`

## Requirements

- Raycast Pro (for AI tools)
- Active FreeAgent account
- OAuth authentication with appropriate permissions

## Privacy & Security

- Uses OAuth 2.0 PKCE flow for secure authentication
- No data is stored locally beyond authentication tokens
- All API calls go directly to FreeAgent's servers

Interact with Freeagent