# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a Raycast extension for macOS and Windows that integrates with the MBC Kanban time tracking API. The extension provides a simple interface to track time entries directly from Raycast, with recent entries stored locally using `@raycast/utils` localStorage hooks.

## Commands

### Development
```pwsh
# Install dependencies
npm install

# Run extension in development mode (opens Raycast dev tools)
npm run dev

# Build the extension for production
npm run build
```

### Code Quality
```pwsh
# Lint code using Raycast's ESLint config
npm run lint

# Auto-fix linting issues
npm run fix-lint
```

### Publishing
```pwsh
# Publish to Raycast Store (NOT npm)
npm run publish
```

## Architecture

### Entry Point
- Single command extension with one entry point: `src/track-time.tsx`
- Uses Raycast's `List` component as the main UI pattern

### State Management
The extension uses two complementary state management approaches:
1. **React state** (`useState`) for transient UI state (search text, loading states)
2. **LocalStorage** (`useLocalStorage` from `@raycast/utils`) for persistent data:
   - `recentTimeEntries`: Array of recent time tracking messages (max 10)
   - `recentTimeEntriesTimestamps`: Record mapping entries to ISO timestamp strings

### API Integration
- Makes POST requests to MBC Kanban API endpoint configured in preferences
- Authentication via `X-Apikey` header
- Payload structure: `{ userId: string, timeTrackingText: string }`
- Error handling includes HTTP status codes and response text parsing

### Configuration
Extension preferences are defined in `package.json` and auto-generate TypeScript types in `raycast-env.d.ts`:
- `userId`: User identifier for time tracking
- `apiKey`: Authentication key (password field)
- `apiUrl`: API endpoint URL

**Important**: Never modify `raycast-env.d.ts` manually - it's auto-generated from `package.json` manifest.

### UI Pattern
The extension implements a search-driven workflow:
1. Empty state shows placeholder + recent entries
2. Typing creates a "New Entry" section with the current search text
3. Pressing Enter submits to API and saves to recent entries
4. Recent entries can be re-tracked by selecting them

## Code Style

- **Print width**: 120 characters
- **Quotes**: Double quotes (not single)
- **Formatting**: Uses Prettier with config in `.prettierrc`
- **Linting**: Follows `@raycast/eslint-config` standards

## Key Dependencies

- `@raycast/api`: Core Raycast SDK (commands, UI components, preferences)
- `@raycast/utils`: Utility hooks (`useLocalStorage`, etc.)
- TypeScript with strict mode enabled
- CommonJS module system (not ESM)

## Platform-Specific Notes

- This extension supports both macOS and Windows (specified in `package.json` platforms)
- On Windows, uses PowerShell (`pwsh`) as the shell environment
- Originally designed to wrap a `tt` command but now directly calls the API
