# Moneytree Changelog

## [Category Budget Management] - {PR_MERGE_DATE}

- Add List Budgets to view saved category limits and current-month spending, percentage used, and remaining balance; Enter opens a detail view with transactions and previous-month spending when available. Edit from the action panel using the standard shortcut; deletion requires confirmation.
- Navigate between budgets and transactions; budget details show this month's transactions for the budget's own category. Spending totals come from Moneytree's monthly presenter rather than a partial transaction search.
- Add AI tools to read, create, update, and delete category budget limits. Writes require an explicitly requested category and amount or deletion target, validate expense categories, and verify results with a fresh read.
- Add AI eval scenarios for read-only suggestions, duplicate budgets, and ambiguous categories.
- Show total budget spending and limits, with progress rings and percentages coloured from green through amber to red as spending approaches the limit.
- Budget details show a searchable list of this month's transactions beside a chart of the amount left or over budget, spending against the limit, a calculated 12-completed-month average, and last month's spending.
- Sort budgets by percentage used (default, remembered), amount spent, limit, or name, and filter to over-budget or nearly used budgets. Stay on the list after creating, editing, or deleting a budget.
- Count each budget only by its own category, matching the Moneytree app; a parent category's budget does not include its subcategories.
- Keep saved limits visible if Moneytree's monthly spending endpoint is unavailable.

## [Improved Category Management & Metadata Updates] - 2026-06-03

- Add a category browser command with custom/built-in filters and custom category create/edit actions
- Remake metadata screenshots so that the old logo is replaced with the new extension icon

## [AI Commands & New Features for Transactions & Categories] - 2026-06-03

- Add an action and AI tools to update transaction descriptions/categories and create custom subcategories
- Improved authentication error handling for auto re-login failures
- Update extension icon to not use the official Moneytree logo
- Added AI tools for asking Raycast AI about Moneytree credentials, accounts, and transactions
- Reused shared Moneytree fetch and cache helpers across AI tools and existing list commands
- Added AI instructions and evals for account balances, transaction searches, and credential health questions

## [Various Improvements] - 2026-04-12

- Made displayed content more similar to https://app.getmoneytree.com
- Paginate on scroll for List Transactions (Used [linear](https://www.raycast.com/linear/linear) as reference)
- Added filter dropdown to the commands
- Added drilling down as default actions
- Added navigation support (esc to back)
- Added launch argument to List Transactions
- Updated screenshots (metadata)

## [Initial Version] - 2025-11-27

- Added authentication using email and password + OAuth 2.0 (PKCE) under the hood
- Added commands to list credentials, accounts with balances and latest transactions
- Added actions to copy details and logout to all commands
- Added Windows support for logout shortcut
