# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VanishLink is a Raycast extension for managing temporary links that automatically expire after configurable periods of inactivity. The extension provides three main commands for adding and managing bookmarks with automatic expiration functionality.

## Development Commands

```bash
# Development
npm run dev          # Start development mode with hot reload
npm run build        # Build the extension for production

# Code Quality
npm run lint         # Run ESLint to check code quality
npm run fix-lint     # Auto-fix linting issues

# Publishing
npm run publish      # Publish to Raycast Store
```

## Architecture

### Core Components
- **Commands**: Three main entry points (`add.tsx`, `add-from-clipboard.ts`, `search.tsx`)
- **Library Functions**: Shared utilities in `src/lib/` for bookmark operations
- **Storage**: Uses Raycast LocalStorage for persistence with automatic cleanup

### Command Structure
1. **Add from Clipboard** (`add-from-clipboard.ts`): No-view command that processes clipboard content
2. **Add Bookmark** (`add.tsx`): Form-based command with URL validation and automatic title fetching  
3. **Search Links** (`search.tsx`): List view with search, edit, and delete capabilities

### Data Model
```typescript
interface BookmarkItem {
  id: string;           // Generated from URL hash
  url: string;          // The bookmark URL
  title: string;        // Page title (auto-fetched or manual)
  createdAt: number;    // Creation timestamp
  lastAccessedAt: number; // Last access timestamp for expiration
}
```

### Key Library Functions
- `bookmark-get.ts`: Retrieves bookmarks with automatic expired item cleanup
- `bookmark-save.ts`: Saves bookmarks with duplicate prevention
- `bookmark-delete.ts`: Removes individual bookmarks
- `constants.ts`: Centralized time constants and expiry day mappings
- `fetch-page-title.ts`: Extracts page titles from HTML meta tags
- `is-expired.ts`: Determines if bookmarks have exceeded expiration period
- `time-format.ts`: Time formatting utilities for remaining time display
- `utils.ts`: ID generation, URL validation, remaining time calculation, and timestamp utilities

### Storage Strategy
- Each bookmark stored as individual LocalStorage item with ID as key
- Automatic cleanup of expired items during retrieval operations
- Expiration configurable via Raycast preferences (1 day to 1 year, default 2 weeks)

### UI Patterns
- Uses Raycast's standard components: `List`, `Form`, `ActionPanel`, `Action`
- Consistent error handling with `Toast` notifications
- Form validation using `@raycast/utils` hooks
- Navigation between views using `useNavigation` hook

## Key Implementation Details

- URL validation ensures proper protocol handling in both add and edit forms
- Page title fetching gracefully falls back to URL if meta extraction fails
- Bookmark IDs generated using URL-based hashing to prevent duplicates
- Last access time updates on URL opening to reset expiration timer
- Empty state includes ActionPanel for direct bookmark addition via Enter key
- Remaining time display shows detailed expiration countdown with improved precision:
  - Under 1 hour: "Xm left" (minutes only)
  - Under 1 day: "Xh Ym left" (hours and minutes)
  - Over 1 day: "Xd Yh left" (days and hours)
- List sorting prioritizes bookmarks with more remaining time
- Centralized time constants in `constants.ts` eliminate code duplication
- Time formatting utilities separated into `time-format.ts` for reusability
- Default expiry period matches package.json configuration (2 weeks)