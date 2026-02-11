# LunchMoney Changelog

## [Major Overhaul] - 2025-12-05

### New Features

- Add new **Account Balances** command to view all connected accounts and net worth
- Add new **Category Totals** command to see spending breakdown by category
- Add **Transaction Detail** view with comprehensive transaction information
- Add **Edit Transaction** form to update category and tags directly from Raycast
- Add flexible date range filtering with quick presets (7/30/90 days, this/last month, this/last year)
- Add pagination support for fetching large transaction lists
- Add ability to copy all visible transactions as CSV
- Add deep links to open transactions directly in Lunch Money

### Improvements

- Migrate to Lunch Money API v2 with auto-generated TypeScript types from OpenAPI spec
- Completely rewrite API client using `openapi-fetch` for type-safe API calls
- Redesign transaction list with improved icons and status indicators
- Add recurring transaction indicator with blue repeat icon
- Add pending transaction indicator with clock icon
- Add income indicator with green up arrow
- Improve payee text truncation for better readability
- Group transactions by day in the list view
- Add transaction date display with smart year formatting (only shows year if not current year)
- Add transaction tags display as accessories
- Add keywords for filtering by payee, category, notes, and tags
- Improve amount formatting with proper currency symbols and income/expense styling
- Add mock mode for randomizing amounts in screenshots
- Update to modern ESLint flat config

### Refactoring

- Remove old `lunchmoney.ts`, `preferences.ts`, `transactions.tsx`, and `transactions_form.tsx` files
- Consolidate components into `components.tsx` with reusable `TransactionListItem`, `DateRangeDropdown`, and `EditTransactionForm`
- Extract formatting utilities to `format.ts`
- Create centralized API client in `api.ts`
- Update TypeScript config for ES2023 and bundler module resolution

## [Edit page, fixes and light improvements] - 2025-01-31

- Add edit transaction pages
- Add more info and changes some info order to a transaction row
- Add transaction status to the List.Item keyword for easier filtering
- Fix month parsing
- Group transactions by day

## [Initial Version] - 2024-11-06
