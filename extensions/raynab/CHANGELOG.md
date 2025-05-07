# Raynab Changelog

## [Improvements & Bug fixes] - 2025-02-14

- Add a dropdown to choose the transaction's payee. Optionally allow manual input
- Aligned currency formatting support with budget settings
- Added support for budget setting decimal separator to create and edit transaction amounts
- Removed hidden categories in transaction forms
- Fixed relative time of locally created transactions being set at midnight of the same day
- Fixed error messages of certain API calls being swallowed without a proper error toast

## [Update dependencies] - 2025-02-12

## [Major Features & Improvements] - 2025-01-19

### ✨ New Features

- Created new "Unreviewed transactions" menu bar command
- Created new "Schedule Transaction" command
- Added support for creating, editing, and deleting transactions in the transaction view
- Added support for reconciled transactions
- Implemented unreviewed transactions management with filtered view and introduced quick approval workflow
- Added scheduled transactions management with filtered view
- Added detailed category view with goal progress tracking
- Added transaction details view with metadata and split transaction support
- Introduced new modifier "amount" for the transaction view
- Added support for transfer transactions
- Added related transactions action for accounts
- Added transaction grouping with totals
- Implemented quick transaction approval for uncategorized transactions

### 💎 Improvements

- Improved budget viewing with visual indicators for budget status
- Enhanced transaction list view with better search and filtering
- Added color coding for different transaction types and goals
- Improved UI feedback with mutations and optimistic updates
- Added better support for split transactions
- Enhanced UI with new icons and tooltips
- Improved query matching with advanced modifiers, and removed dash requirement
- Added support for timezone alignment to UTC
- Updated goal support to match the latest YNAB changes

### 🐞 Bug Fixes

- Fixed empty view during budget loading
- Fixed modifiers-only search in transaction view
- Fixed handling of apostrophes and quotes in category names
- Resolved category field amounts display for transfers
- Fixed flag colors in transaction forms
- Fixed constant rerendering issues
- Resolved localStorage maximum size overflow
- Fixed validation errors across forms

### 🔧 Technical Updates

- Updated to latest Raycast API and SWR versions
- Upgraded TypeScript, dayjs, and YNAB SDK
- Use common Raycast utilities to simplify caching
- Improved code organization and utilities
- Added tests for crucial utilities
- Updated package.json to common Raycast extension standards
- Added new preferences

## [Added Raynab] - 2022-03-07

- Initial version with YNAB integration
- Basic budget viewing functionality
