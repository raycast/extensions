# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for tracking Bitvavo cryptocurrency portfolios. It provides real-time portfolio tracking with gain/loss calculations based on trading history.

## Development Commands

- `npm run dev` - Start development mode (Raycast CLI development)
- `npm run build` - Build the extension for production
- `npm run lint` - Run ESLint to check code quality
- `npm run fix-lint` - Automatically fix linting issues
- `npm test` - Run tests using Vitest
- `npm run publish` - Publish extension to Raycast Store

## Architecture

### Core Components

**Main Entry Point**: `src/portfolio.tsx`
- React component that renders the Raycast List interface
- Manages portfolio data state and loading/error states
- Uses Effect streams for real-time data updates

**Portfolio Stream Service**: `src/bitvavo/PortfolioStreamService.ts`
- Effect-based service for managing Bitvavo API connections
- Handles WebSocket subscriptions for real-time price updates
- Orchestrates data fetching (balances, trades, prices)
- Uses retry strategies and error handling

**Portfolio Calculation**: `src/bitvavo/getSummary.ts`
- Pure function that calculates portfolio metrics from raw data
- Computes weighted average buy prices, gain/loss, and percentages
- Uses `number-precision` library for accurate financial calculations

**Runtime Configuration**: `src/bitvavo/Runtime.ts`
- Provides Effect runtime with necessary services and configuration
- Handles environment configuration from Raycast preferences

### Key Technologies

- **Effect**: Functional programming library used throughout for data streaming, error handling, and service orchestration
- **Raycast API**: UI components (`List`, `Detail`, `ActionPanel`) and preferences management
- **Bitvavo SDK**: Third-party library for Bitvavo API integration (REST + WebSocket)
- **number-precision**: Library for accurate decimal arithmetic in financial calculations
- **Vitest**: Testing framework

### Data Flow

1. User opens extension → `portfolio.tsx` loads
2. Preferences (API keys) → `Runtime.ts` → `PortfolioStreamService.ts`
3. Service fetches: balances, trades, and subscribes to price streams
4. Real-time price updates trigger `getSummary` recalculations
5. Portfolio data streams to UI via Effect streams

### Schema Definitions

All API responses and internal data structures are defined using Effect Schema in `src/bitvavo/schema.ts`:
- `Balance` - User's cryptocurrency balances from Bitvavo
- `Trades` - Historical trading data for cost basis calculation
- `Ticker24h` - Real-time price data from WebSocket
- `Asset` - Computed portfolio asset with gains/losses
- `Summary` - Complete portfolio summary with totals

### Testing

- Tests located in `src/bitvavo/tests/`
- Uses Vitest for unit testing
- Focus on testing portfolio calculation logic in `getSummary`

### Error Handling

- Custom error types in `src/bitvavo/errors.ts`
- Effect-based error handling with retry strategies
- User-friendly error display in Raycast interface