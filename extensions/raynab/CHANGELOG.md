# Raynab Changelog

## [Fixed Currency Format Validation in Transaction Forms] - 2025-08-04

### 🐞 Bug Fixes
- Fixed transaction amount validation to properly handle different currency formats (e.g., European "1.234,56" vs US "1,234.56")
- Amount validation now respects YNAB budget currency settings for decimal and group separators
- Resolves issue where users with non-US currency formats couldn't enter amounts in their preferred format

## [Improved Category Search & Fixed Budget Details] - 2025-05-30

### ✨ New Features
- Support for searching categories with emoji icons in their names

### 🐞 Bug Fixes
- Category search now works properly for categories that start with emoji icons
- Budget details in "Show Monthly Budget" now correctly shows the current month's data instead of always showing the first month

### 🔧 Technical Updates
- Updated "Open in Ynab" button text to "Open in YNAB" to match YNAB's branding

## [AI Budget Tools & Improvements] - 2025-05-21

### ✨ New Features - AI Extensions
- Added new AI Extensions for natural language budget queries:
  - `get-budget`: Query budget information including age of money and monthly details
    - Example: "What is the age of money in my March budget?"
    - Example: "Tell me about this month's budget?"
  - `get-big-numbers`: Track spending for today, this week, and this month
    - Example: "How much have I spent today?"
    - Example: "What are my big three numbers?"
  - `get-transactions`: Search and filter transactions with natural language
    - Example: "Show me all transactions from Taco Bell last month"
    - Example: "Find my largest expense this week"
  - `get-categories`: Query category information and spending
    - Example: "How much did I spend on groceries last month?"
    - Example: "Which categories are over budget?"

### 💎 Improvements
- Enhanced budget data retrieval with proper date formatting
- Improved error handling for budget queries by sending you to the select a budget screen
- Added detailed logging for budget tool debugging
- Enhanced currency formatting in budget responses
- Added support for natural language queries across all tools
- Improved error messages and user feedback for AI tool operations

### 🐞 Bug Fixes
- Fixed date format mismatch in budget month queries
- Fixed budget data retrieval for specific months
- Resolved issues with budget currency formatting
- Fixed error handling in AI tool operations
- Resolved issues with transaction form validation for create and edit

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