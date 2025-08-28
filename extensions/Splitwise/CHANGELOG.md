# Splitwise Changelog

## [New Features] - {PR_MERGE_DATE}

- Added category selection dropdown to the Add Expense form
- Categories are fetched from Splitwise API and include both parent categories and subcategories

## [New Features] - 2025-08-22

- Add "Recent" section to `Add Expense` showing the top 3 most recently updated friends/groups, which aligns with Splitwise's app UI

## [Improvements] - 2024-09-28

- Added support for multiple currencies
- Added revalidation after adding and updating expenses

## [Fixed Bug] - 2024-02-06

- Fixed issue when adding expense to friends
- Added user's default currency to the expense form

## [Fixed Bug] - 2024-01-04

- Updated `Add Expense` command to work with supported API endpoint

## [Fixed Bugs] - 2023-12-19

- Fixed issue: `TypeError: Cannot read properties of undefined (reading 'name')`.
- Improved optimistic update for expense deletion.

## [New Features] - 2023-09-29

- Added new command `List Expenses` which allows to list all expenses, edit, and delete them
- Added 'Reload' and 'Open in Browser' to `Add Expense` command
- Improved API Calls

## [New Features] - 2023-08-09

- Added support for adding expenses to groups

## [Initial Version] - 2023-02-10
