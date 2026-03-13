# Wise Accounts Changelog

## Add date to transaction list - 2025-01-17

- Use `Intl.DateTimeFormat` and add date to the properties in transaction list

## Improve Get Transactions

- Use Main Profile ID for Get Transactions default Profile ID
- Retrieve all transactions from API (previously it only retrieve card transactions)
- Remove filters from Get Transactions if there are not transactions with such filters
- Add custom tags for Sent (Red ->) & Received (Green <-) transactions

## Fix Business Account - 2024-10-18

- Fixes error retrieving accounts when Business Account available
- Use Main Profile ID for Get Balances default Profile ID

## [Initial Version] - 2024-01-25

Initial version code. Includes commands to:

- Fetch profiles
- Fetch balances
- Fetch transactions
- Display Balances and transaction of the day on the menu bar
