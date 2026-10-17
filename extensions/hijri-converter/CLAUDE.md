# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for converting dates between Hijri (Islamic) and Gregorian calendars. It's built with TypeScript, React, and the Raycast API for macOS integration.

## Development Commands

```bash
npm run dev          # Start development mode with hot reload
npm run build        # Build the extension for production
npm run lint         # Run ESLint
npm run fix-lint     # Auto-fix linting issues
npm run publish      # Publish to Raycast Store
```

## Coding Standards

- **Indentation**: 2 spaces
- **Quotes**: Double quotes (configured in `.prettierrc`)
- **Naming Conventions**:
  - **Components**: `PascalCase`
  - **Functions/Variables**: `camelCase`
  - **Constants**: `UPPER_SNAKE_CASE`
  - **Interfaces**: `PascalCase`
- **Key Libraries**: `@raycast/api`, `@raycast/utils`, `hijri-converter`

## Architecture

### Command Structure

Each command in the extension is a separate React component located in `src/`:

- `convert-date.tsx` - Hijri to Gregorian converter
- `gregorian-to-hijri.tsx` - Gregorian to Hijri converter
- `show-today.tsx` - Today's date in both calendars
- `hijri-calendar.tsx` - 14-day calendar view
- `menu-bar.tsx` - Menu bar integration

Commands are registered in `package.json` under the `commands` array with a `mode` field (`view` or `menu-bar`).

### Core Utilities (`src/utils.ts`)

All date conversion logic is centralized in `utils.ts`:

- **Conversions**: `convertHijriToGregorian()`, `convertGregorianToHijri()` - wrapper functions around the `hijri-converter` npm package
- **Formatting**: `formatHijriDate()`, `formatGregorianDate()`, `formatGregorianDateShort()`, `formatHijriDateShort()`
- **Validation**: `isValidHijriDay()`, `isValidHijriMonth()`, `isValidHijriYear()`
- **Helpers**: `getTodayHijri()`, `getTodayGregorian()`, `getDayName()`, `getHijriMonthName()`
- **Constants**: `HIJRI_MONTHS`, `GREGORIAN_MONTHS`, `DAY_NAMES`

**Note**: Hijri months alternate between 30 days (odd months) and 29 days (even months). Dhu al-Hijjah (month 12) can have 30 days in leap years.

### Key Patterns

1. **Forms with Live Preview**: Conversion forms update the result in real-time as the user types using `useState` and `useEffect` hooks
2. **Auto-Copy on Submit**: Results are automatically copied to clipboard when the user submits
3. **Defaults to Today**: All date inputs default to the current date for convenience
4. **Inter-Command Navigation**: Uses `launchCommand` from `@raycast/api` to navigate between commands (e.g., from menu bar to full converter)
5. **Error Handling**: Wrap conversion calls in try/catch and show user-friendly error messages

### UI Components

- **Forms**: Use `Form.Dropdown` for month selection, `Form.TextField` for numeric input
- **Lists**: Use `List` and `List.Item` for calendar views
- **Detail View**: Use `Detail` component for displaying today's date with keyboard shortcuts
- **Menu Bar**: Use `MenuBarExtra` for always-visible menu bar integration

## Dependencies

- `@raycast/api` - Core Raycast API for UI components and utilities
- `@raycast/utils` - Additional utilities
- `hijri-converter` - Core date conversion library (the only non-Raycast dependency)

## Raycast-Specific Notes

- All commands must be exported as default from their files
- Use `launchCommand` from `@raycast/api` with `name: "<command-name>"` to navigate between commands (names match the `name` field in package.json)
- Menu bar commands use `mode: "menu-bar"` and render a `MenuBarExtra` component
- The `ray develop` command watches for file changes and hot-reloads
