# Mercury Changelog

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
