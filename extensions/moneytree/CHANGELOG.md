# Moneytree Changelog

## [Categorize Transactions] - 2026-06-03

- Add an action and AI tools to update transaction descriptions/categories and create custom subcategories
- Improved authentication error handling for auto re-login failures
- Update extension icon to not use the official Moneytree logo

## [Ask Moneytree] - 2026-06-03

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
