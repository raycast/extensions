# Portfolio Tracker

## [Profit & Loss Tracking] - 2026-07-17

### Features

- Record an optional average buy price per position, set when adding an investment or later via Edit Asset, to track unrealized profit/loss (P&L)
- P&L tag on each position showing gain/loss percentage, with amount shown on hover
- Cost basis section in the position detail panel with average buy price, total invested, and unrealized P&L
- Portfolio summary row totals unrealized P&L across all positions with a buy price recorded
- "Total Value Invested" mode divides by your buy price when entered, falling back to the live price otherwise
- Adding units with a "Price Paid per Unit" updates the average buy price using a weighted average
- CSV import/export supports an optional "Average Cost" column, backward compatible with older files

## [Initial Version] - 2026-04-08

### Features

- View and manage portfolio with per-account breakdowns and detail panel toggle (ISA, LISA, SIPP, GIA, Brokerage, 401(k), Crypto, Savings, Current Account, Property: Mortage and Fully Owned, Debt: Credit Card, Personal Loan, Student Loan, Auto Loan, Buy-Now-Pay-Later)
- Property tracking with HPI-based appreciation (UK postcodes), mortgage principal repayment calculations, and shared ownership support
- Debt tracking with auto-applied monthly repayments, interest accrual, amortisation schedules, paid-off detection, and archive functionality
- FIRE (Financial Independence, Retire Early) dashboard with projection charts, contribution tracking, and configurable parameters
- Search for stocks, ETFs, and funds with real-time type-ahead powered by Yahoo Finance
- Import/Export portfolio data via CSV
- Cross-currency support with automatic FX rate conversion to your chosen base currency
- Daily price caching to minimise API calls to Yahoo Finance
- Rename assets with custom display names (original name shown on hover and in detail panel)
- Sort positions by value or daily change (ascending/descending)
- Cash holdings with multi-currency support
- Sample portfolio auto-loaded on first launch to showcase all features
- Add positions with fractional share support
- Automatic GBp → GBP (and other minor currency) normalisation for LSE-listed securities
