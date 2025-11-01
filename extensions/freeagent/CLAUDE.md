# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for FreeAgent that allows users to:
- List invoices with filtering and display options
- View tax timeline items 
- Create new invoices through a form interface

The extension uses OAuth 2.0 PKCE flow for authentication with FreeAgent's API.

## Development Commands

```bash
# Development mode (hot reload)
npm run dev

# Build the extension
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Publish to Raycast Store
npm run publish
```

## Architecture

### Core Files
- `src/oauth.ts` - OAuth configuration and authentication setup using Raycast's OAuth utilities
- `src/types.ts` - Shared TypeScript interfaces and types for the entire application
- `src/services/FreeAgent.ts` - Centralized API service with all FreeAgent API calls
- `src/utils/formatting.ts` - Shared utility functions for formatting currency, dates, and display names
- `src/hooks/useFreeAgent.ts` - Custom React hook for authentication and company info management
- `src/list-invoices.tsx` - Main invoice listing command 
- `src/list-timeline.tsx` - Tax timeline display command
- `src/create-new-invoice.tsx` - Invoice creation form

### Architecture Principles
The codebase follows DRY principles with shared services and utilities:

**Types (`src/types.ts`)**
- All TypeScript interfaces centralized in one location
- API response types for consistent data handling
- Form value types for type-safe form handling
- Extended with bank transaction explanation update and attachment types

**Services (`src/services/FreeAgent.ts`)**
- Single `makeRequest` function handles all API calls with consistent error handling
- Custom `FreeAgentError` class for API error handling
- Functions: `getCompanyInfo`, `fetchInvoices`, `fetchContacts`, `fetchTimelineItems`, `createInvoice`
- Extended with: `updateBankTransactionExplanation`, `uploadAttachment`, `getBankTransactionExplanation`

**Utilities (`src/utils/formatting.ts`)**
- Currency formatting with `Intl.NumberFormat`
- Date parsing and URL generation utilities
- Status color mapping and contact display name logic

**Custom Hook (`src/hooks/useFreeAgent.ts`)**
- Centralized authentication state management
- Company info fetching and caching
- Consistent error handling across all components
- Loading state management

### Authentication Pattern
All commands use the `authorizedWithFreeAgent` HOC from `oauth.ts` plus the `useFreeAgent` hook:
- OAuth 2.0 PKCE flow via Raycast's proxy service
- `useFreeAgent` hook manages authentication state and company info
- Automatic company info fetching on authentication
- Centralized error handling with toast notifications

### API Integration
- Base URL: `https://api.FreeAgent.com/v2/`
- Authentication: Bearer token in Authorization header
- User-Agent: "Raycast FreeAgent Extension"
- All API calls go through the centralized service layer
- Consistent error handling with custom `FreeAgentError` class

### UI Patterns
- Components are simplified and focus on UI logic only
- Business logic is handled by services and hooks
- Consistent error handling via `useFreeAgent.handleError`
- Loading states managed by the `useFreeAgent` hook
- Status-based color coding (Red=overdue, Green=paid, Yellow=draft, etc.)

### State Management
- `useFreeAgent` hook centralizes authentication and company info state
- Components use local `useState` only for component-specific data
- `useEffect` for data fetching when authentication is ready
- All error states handled through the custom hook

### Preferences
The extension supports user preferences defined in package.json:
- `default_payment_terms_in_days` - Default payment terms for new invoices