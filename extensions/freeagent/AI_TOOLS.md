# AI Tools for FreeAgent Raycast Extension

This document describes the AI tools implemented for the FreeAgent Raycast extension.

## Overview

The extension includes 15 AI tools that provide natural language interaction with FreeAgent data:

## Tools

### 1. `analyze-financials`
**Purpose**: Provides comprehensive financial overview and insights
**Usage**: `@freeagent show me my financial overview`

**Features**:
- Total invoice value and paid amounts
- Overdue invoice analysis
- Payment efficiency metrics
- Business insights and recommendations
- Recent activity summaries

### 2. `find-invoice`
**Purpose**: Smart invoice search using natural language
**Usage**: `@freeagent find invoice for ABC Company`

**Search Capabilities**:
- Client name matching
- Amount searches (e.g., "£150", "100")
- Date-based searches
- Status filtering (draft, sent, paid, overdue)
- Reference number searches

### 3. `create-invoice-ai`
**Purpose**: Create invoices using natural language with confirmation
**Usage**: `@freeagent create invoice for John Smith for £500 consulting work`

**Features**:
- Automatic client matching
- Confirmation dialog before creation
- Intelligent amount extraction
- Payment terms configuration
- Email notification settings

### 4. `categorize-transactions`
**Purpose**: Analyze and categorize bank transactions
**Usage**: `@freeagent analyze my spending patterns`

**Analysis Types**:
- Recent transaction summaries
- Unexplained transaction identification
- Large transaction highlighting
- Spending pattern categorization
- Monthly breakdowns

### 5. `client-insights`
**Purpose**: Analyze client relationships and payment behavior
**Usage**: `@freeagent show me client insights for ABC Company`

**Insights Provided**:
- Top clients by revenue
- Payment pattern analysis
- Average payment times
- Overdue amount tracking
- Client-specific detailed analysis

### 6. `cash-flow-summary`
**Purpose**: Comprehensive cash flow analysis and forecasting
**Usage**: `@freeagent what's my cash flow looking like?`

**Features**:
- Current bank position
- Invoice pipeline analysis
- Cash flow trends by period
- Upcoming payment projections
- Business insights and recommendations

### 7. `explain-transactions`
**Purpose**: List unexplained bank transactions that need attention
**Usage**: `@freeagent show me unexplained transactions`

**Features**:
- Lists transactions that are `unexplained` or `marked_for_review`
- Provides transaction URLs needed for creating explanations
- Shows basic transaction details (amount, date, description)
- No AI categorization or suggestions (simplified from previous version)

### 8. `list-categories`
**Purpose**: List all available FreeAgent categories for transaction explanations
**Usage**: `@freeagent show me available categories`

**Features**:
- Fetches all categories from FreeAgent (admin expenses, cost of sales, income, general)
- Groups categories by type for easy browsing
- Provides category URLs needed for transaction explanations
- Shows nominal codes and tax allowable status
- No guessing or matching - just lists available options

### 9. `add-bank-transaction-explanation`
**Purpose**: Add explanations to unexplained bank transactions
**Usage**: `@freeagent add explanation for transaction [URL] as [description] with category [URL]`

**Features**:
- Creates actual transaction explanations in FreeAgent
- **IMPORTANT**: Only use for unexplained transactions
- Accepts category URLs from the list-categories tool
- Supports sales tax status and rate configuration
- Real API integration with /bank_transaction_explanations endpoint
- Enhanced error handling for marked_for_review transactions

### 10. `update-bank-transaction-explanation`
**Purpose**: Update existing explanations for marked_for_review transactions
**Usage**: `@freeagent update explanation [URL] to change description to [new description]`

**Features**:
- Updates existing auto-generated explanations
- **IMPORTANT**: Use for marked_for_review transactions only
- Clears the "marked for review" status
- Supports updating description, category, amount, tax details
- Can add attachments to existing explanations
- Provides before/after comparison

### 11. `upload-attachment`
**Purpose**: Upload files (receipts, invoices) to FreeAgent for use with explanations
**Usage**: `@freeagent upload receipt file receipt.pdf`

**Features**:
- Supports PDF, JPEG, PNG, CSV and other common file types
- Returns attachment URL for use with explanation tools
- Base64 file encoding support
- File size and type validation
- Optional description field for organization

### 12. `list-bank-transaction-explanations`
**Purpose**: List existing explanations and find URLs for updates
**Usage**: `@freeagent list explanations for marked for review transactions`

**Features**:
- Lists transactions marked for review that need updates
- Helps identify explanation URLs for the update tool
- Shows which transactions need updates vs new explanations
- Provides summary of accounts and transaction counts

### 13. `search-explained-transactions`
**Purpose**: Search through previously explained transactions for patterns and insights
**Usage**: `@freeagent search for explained transactions from ABC Company`

**Features**:
- Historical transaction search
- Pattern analysis and insights
- Vendor/client frequency analysis
- Monthly spending breakdowns
- Transaction categorization insights
- Learning from past explanations

### 14. `match-file-to-transaction`
**Purpose**: Match files (invoices, receipts, etc.) to bank transactions for explanation and attachment
**Usage**: `@freeagent match invoice file 'Invoice_500.pdf' with amount £500 dated 2024-01-15`

**Features**:
- Smart file-to-transaction matching
- Date and amount tolerance configuration
- File type-aware matching (invoice vs receipt)
- Confirmation workflows before changes
- Explanation generation based on file content
- Integration with FreeAgent invoice matching

### 15. `update-bank-transaction`
**Purpose**: Update bank transaction properties, particularly to clear marked_for_review status
**Usage**: `@freeagent update transaction [URL] to clear marked for review status`

**Features**:
- Clear marked_for_review flag to complete transaction processing
- Update transaction descriptions
- **IMPORTANT**: Use after updating explanations to finalize transaction
- Provides before/after status comparison
- Handles transaction state transitions
- Integration with explanation workflow

## Bank Transaction Explanation Workflow

### Understanding Transaction States
- **Unexplained**: Transactions with no explanation → use `add-bank-transaction-explanation`
- **Marked for Review**: Transactions with auto-generated explanations → use `update-bank-transaction-explanation` + `update-bank-transaction`
- **Explained**: Transactions with approved explanations → no action needed

### Complete Workflow for Marked for Review Transactions
1. Use `update-bank-transaction-explanation` to fix the explanation
2. Use `update-bank-transaction` to clear the marked_for_review flag
3. Transaction is now fully processed and explained

### Error Handling for 422 Errors
When `add-bank-transaction-explanation` returns "This transaction has already been fully explained":
1. The transaction is marked_for_review, not unexplained
2. Use `update-bank-transaction-explanation` instead
3. Use `list-bank-transaction-explanations` to find explanation URLs

### File Attachment Workflow
1. Upload file with `upload-attachment` 
2. Copy the returned attachment URL
3. Use attachment URL with explanation tools (create or update)

## Technical Implementation

### Architecture
- All tools use the existing `src/services/freeagent.ts` API service
- Extended service with new functions:
  - `updateBankTransactionExplanation`
  - `uploadAttachment`
  - `getBankTransactionExplanation`
- Leverage `src/hooks/useFreeAgent.ts` for authentication
- Utilize `src/utils/formatting.ts` for consistent formatting
- Follow Raycast AI tool patterns with TypeScript interfaces

### Error Handling
- Graceful authentication error handling
- API error management with user-friendly messages
- Input validation and sanitization
- Fallback behaviors for missing data
- Clear guidance for 422 errors and workflow issues

### AI Instructions
Global AI instructions ensure consistent behavior:
- Clear, actionable insights
- Emoji usage for readability
- Focus on practical business insights
- Proper currency formatting
- Authentication guidance
- **Workflow-aware tool selection based on transaction state**

## Usage Examples

### Basic Operations
```
@freeagent show me my financial overview
@freeagent find invoices for ABC Company
@freeagent create invoice for John Smith for £500 web design
@freeagent analyze my spending patterns
@freeagent who are my top paying clients?
@freeagent what's my cash flow looking like?
```

### Bank Transaction Explanations
```
# List transactions needing attention
@freeagent show me unexplained transactions
@freeagent list explanations for marked for review transactions

# Get available categories
@freeagent show me available categories

# For unexplained transactions
@freeagent add explanation for transaction [URL] as "Office supplies" with category [URL]

# For marked_for_review transactions (2-step process)
@freeagent update explanation [URL] to change description to "Updated office supplies"
@freeagent update transaction [URL] to clear marked for review status

# Upload attachments
@freeagent upload receipt file receipt.pdf with base64 data [data]

# Search historical data
@freeagent search for explained transactions from ABC Company
@freeagent match invoice file 'Invoice_500.pdf' with amount £500 dated 2024-01-15
```

## Future Enhancements

Additional useful tools that could be implemented:

1. **Auto-explanation Rules** - Set up automatic explanation rules based on transaction patterns
2. **OCR Document Processing** - Extract data from uploaded receipts and invoices automatically  
3. **Smart Duplicate Detection** - Identify and flag potential duplicate transactions
4. **Tax Category Assistant** - Help categorize expenses for tax reporting purposes
5. **Invoice Template Generator** - Create invoice templates based on past invoices
6. **Payment Predictor** - Predict when invoices will be paid based on client history
7. **Budget Tracker** - Compare actual vs planned expenses
8. **Recurring Invoice Manager** - Manage and optimize recurring billing
9. **Client Communication Helper** - Draft follow-up emails for overdue invoices
10. **Financial Report Generator** - Create custom financial reports and summaries

These additional tools would further enhance the AI-powered financial management capabilities of the extension.