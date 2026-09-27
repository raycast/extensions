# Mercury Changelog

## [Multiple Accounts, Statements, and Menu Bar] - {PR_MERGE_DATE}

- Connect more than one Mercury account, such as personal and business, from the new Manage Accounts command. Your existing API key is imported automatically
- Balances load instantly from an encrypted cache, then refresh in the background
- Added Search Transactions: search all your accounts at once, with a detail sidebar, categories, receipts, and export to CSV, Markdown, or plain text
- Each account's transactions can be filtered by status (pending, failed) or category
- Added View Statements: download statements, open them as PDFs, or download a whole year at once
- Added a Mercury Balance menu bar command. Hold ⌥ to choose which accounts count toward the total
- Added wire details you can view, copy, or save as a text file
- Added your Treasury account, with its transactions, and credit balances for business accounts
- Added a View Cards command, with each card's transactions
- Added AI tools for Treasury and cards; `@mercury` can now search transactions across all accounts and report your largest transactions
- Removed the AI Account Summary command. Ask `@mercury` in Raycast AI instead, which supports follow-up questions and your chosen model
- Added Debug Logging and Strict Redaction preferences for troubleshooting
- Fixed missing counterparty icons in the transactions list
- Invalid API tokens now show why Mercury rejected them, with an action to update the token
- Error toasts now include an action to copy the error
- Updated keyboard shortcuts to standard Raycast conventions
- Migrated to Raycast API v2 and removed the `node-fetch` dependency
- Added setup help for finding your Mercury API token

## [Initial Version] - 2023-08-29

- View Mercury accounts and balances
- View recent transactions
- Filter transactions by type
- Copy account and routing numbers

## [AI Account Summary] - 2024-08-01

- Get an AI-generated summary of your accounts

## [Enhanced AI Account Summary with Detailed Metadata] - 2024-10-16

- Added Detailed Metadata to AI Account Summary:
  - Incorporated structured financial data alongside the AI-generated summary using Detail.Metadata components.
  - Displayed account balances, total assets, and net worth in the metadata panel.
  - Included key financial metrics such as cash flow summaries and significant transactions.
- Color-coded Financial Health Indicator:
  - Added a color-coded tag summarizing the overall financial health in the metadata.
  - The tag displays “Strong”, “Stable”, or “Weak” status based on account balances and cash flow.
- Extended Transaction History to Past 12 Months:
  - Updated transaction filtering to include transactions from the past 12 months instead of just the last 30 days.
  - Adjusted cash flow summaries and significant transactions to reflect the extended time frame.
- Improved User Interface and Readability:
  - Enhanced readability by organizing metadata with separators and logical grouping.
  - Used icons and labels for better visual clarity in the metadata panel.
  - Implemented Detail.Metadata.TagList for displaying tags in a row.
- Bug Fixes and Performance Improvements:
  - Resolved issues with calculations occurring before data loading, ensuring accurate financial metrics.
  - Improved data fetching and state management for smoother performance.
  - Fixed variable scope issues to prevent reference errors.
  
## [Interactive AI Assistant with Follow-up Questions] - 2024-10-17

- Follow-up Question Capability:
  - Introduced the ability to ask follow-up questions to the AI-generated account summary.
  - Users can interact with the AI assistant to gain deeper insights and clarifications about their financial data.

## [Bug Fixes and Performance Improvements] - 2024-10-28

- Fixed crash when retrying summary generation by replacing browser-specific `window.location.reload()` with Raycast-native navigation methods.

## [Integration of AI-Driven Financial Tools] - 2025-02-28

- Introduced AI tools for account balance inquiries, transaction insights, and comprehensive financial analyses
- Improved AI eval tests for reliable behavior assessments
