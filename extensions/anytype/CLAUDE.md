# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
- `npm run dev` - Start Raycast development mode
- `npm run build` - Build the extension
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run typecheck` - Run TypeScript type checking

### Testing
- `npm test` - Run tests with Vitest
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:coverage` - Run tests with coverage report

### Single Test Execution
- `npx vitest run <file-pattern>` - Run specific test files
- `npx vitest run src/utils/api.test.ts` - Run single test file

## Architecture Overview

This is a Raycast extension for Anytype that enables users to interact with Anytype's local API directly from Raycast. The codebase follows a modular architecture:

### Core Structure
- **`src/api/`** - API layer organized by feature domains (auth, objects, spaces, lists, members, etc.)
- **`src/components/`** - React components for UI, organized by purpose (Forms, Actions, Lists, etc.)
- **`src/hooks/`** - Custom React hooks for data fetching and state management
- **`src/models/`** - TypeScript interfaces and types
- **`src/utils/`** - Utility functions for API calls, error handling, form validation, etc.
- **`src/tools/`** - AI-enabled tools for Raycast's AI integration
- **`src/mappers/`** - Data transformation functions between API responses and UI models

### Key Architectural Patterns

**API Layer**: Centralized in `src/utils/api.ts` with `apiFetch()` function that handles authentication, error handling, and response parsing. Each API endpoint is organized by domain (objects, spaces, members, etc.).

**Authentication**: Token-based authentication with local storage fallback. Supports both manual API keys and app-based pairing flow.

**Data Flow**: API → Hooks → Components. Custom hooks encapsulate data fetching logic and provide React Query-like patterns for caching and state management.

**Component Organization**:
- Forms for creation/updates are in `CreateForm/` and `UpdateForm/`
- List components for displaying collections
- Action components for user interactions
- Empty view components for no-data states

**AI Tools Integration**: Special tool files in `src/tools/` that interface with Raycast's AI system, allowing natural language interaction with Anytype data.

### Raycast Integration
The extension integrates with Raycast through:
- Commands defined in `package.json` that map to main component files
- AI tools for natural language interaction
- Preferences for API configuration and behavior customization
- Local authentication flow with the Anytype desktop app

### Testing Setup
- Vitest for testing with Happy DOM environment
- Mocked Raycast API in `src/test/mocks/raycast.ts`
- Coverage reporting configured
- Test files follow `.test.ts` naming convention

## Context Actions Pattern

### Action Structure
Actions are organized in `ActionPanel.Section` groups:
1. **Primary actions**: Open/View actions (deeplinks, show details/list/tags)
2. **Edit actions**: Edit, Delete, Pin/Unpin operations
3. **Auxiliary actions**: Create, Refresh

### Common Patterns
- **Keyboard shortcuts**: Use `Keyboard.Shortcut.Common.*` (Edit, New, Remove, Refresh)
- **Icons**: Standard Raycast icons (Icon.Pencil, Icon.Trash, Icon.Plus, Icon.RotateClockwise)
- **Delete actions**: Always use `confirmAlert()` with red trash icon, `Action.Style.Destructive`
- **Title format**: `{Action} {EntityType}` (e.g., "Edit Tag", "Delete Property")
- **Handlers**: Async functions with try/catch, success/failure toasts, and mutate calls
- **Deeplinks**: Use `anytypeObjectDeeplink(spaceId, objectId)` for Anytype navigation
