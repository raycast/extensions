# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Build: `npm run build`
- Development: `npm run dev`
- Lint: `npm run lint`
- Publish extension: `npm run publish`

## Coding Standards

- **Formatting**: Raycast's `ray lint` is the single source of truth (no custom .prettierrc or conflicting configs)
- **Types**: Use explicit TypeScript types/interfaces, readonly where appropriate
- **Imports**: Group external libraries first, then internal modules
- **Naming**: PascalCase for classes/types, camelCase for variables/functions, UPPER_SNAKE_CASE for constants
- **Error Handling**: Use custom error classes derived from TanaConverterError with rich context
- **Components**: Use functional React components with async functions for Raycast commands
- **Documentation**: Add JSDoc comments for all public functions, methods and classes
- **Architecture**: Follow pure functional programming principles with immutable data structures
- **Testing**: Currently no explicit testing framework - validate changes manually

## Files to Ignore

- **`raycast-env.d.ts`**: Auto-generated file from extension manifest. Do not modify or warn about this file.

## Raycast Extension Compliance

### Technical Requirements
- **Dependencies**: Use npm with `package-lock.json` committed
- **API Version**: Always use latest Raycast API version
- **Build**: Run `npm run build` before submission
- **License**: Must use MIT license
- **Node.js**: Requires Node.js 22.14 or higher
- **Raycast**: Requires Raycast 1.26.0 or higher

### Naming Conventions
- **Commands**: Use `<verb> <noun>` or just `<noun>` format
- **Titles**: Follow Apple Style Guide, use title case
- **Avoid**: Generic names, articles ("a", "an"), restricted words ("Assistant")
- **Prefer**: Nouns over verbs for clarity

### UI/UX Standards
- **Navigation**: Use Raycast Navigation API
- **Empty States**: Handle gracefully with helpful messages
- **Placeholders**: Provide in all text fields
- **Icons**: 512x512px PNG, must work in light/dark themes (no default Raycast icon)
- **Preferences**: Use Preferences API for configuration (not separate commands)
- **Keyboard Shortcuts**: Do not hardcode shortcuts in Actions - let users configure them through Raycast preferences

### Security & Privacy
- **No Keychain Access**: Will be rejected for security
- **No External Analytics**: Prohibited
- **User Data**: Only use for service connection and extension improvement
- **Binary Dependencies**: Avoid opaque or unverified binaries
- **Third-party Services**: Must comply with their Terms of Service

### Quality Standards
- **Value**: Must provide genuine value beyond native Raycast functionality
- **Documentation**: Provide README for complex setup requirements
- **Changelog**: Include CHANGELOG.md for updates
- **Error Handling**: Implement robust error handling with helpful messages
- **Maintenance**: Developer responsible for ongoing support and bug fixes

## Project Structure

This extension provides tools to convert various formats to Tana Paste format:

- Command files in `src/` for Raycast commands
- Content extraction utilities in `src/utils/page-content-extractor.ts`
- Unified Tana formatter in `src/utils/tana-formatter/` (single conversion system)

## Key Architecture Principles

### Browser Tab Detection
- **NEVER use** `tabs.find(tab => tab.active)` - it finds wrong tabs from different browser windows
- **ALWAYS use** focused tab title matching approach:
  1. Get focused tab title via `BrowserExtension.getContent()` without tabId
  2. Match that title in the tabs list from `BrowserExtension.getTabs()`
  3. Fall back to highest ID tab if no match found

### Content Processing Pipeline
1. Extract content using `BrowserExtension.getContent()` with reader mode
2. Convert HTML to markdown using TurndownService if needed
3. Unescape Raycast's escaped markdown (`unescapeRaycastMarkdown()`)
4. Remove problematic content (`cleanContentForTana()`)
5. Format for Tana using centralized `formatForTana()` utility

### Unified Tana Formatting System
- **Single Entry Point**: All commands use `formatForTana()` from `/utils/tana-formatter/`
- **Automatic Content Detection**: System detects Limitless transcripts, YouTube content, browser pages
- **Smart Processing**: Each content type gets appropriate processing with smart chunking, boundary detection
- **Consistent Output**: All formatting follows same patterns and escaping rules

### Tana Format Guidelines
- Escape `#` symbols to `\#` to prevent unwanted tag creation
- Convert markdown headers (`## Header`) to Tana headings (`!! Header`)
- Remove `::` from content to prevent accidental field creation
- Use flat structure under `Content::` field for better hierarchy
- Smart transcript chunking with sentence/word boundary detection

### Content Processing Architecture
- **Content Detection** (`content-detection.ts`): Identifies content types
- **Content Processing** (`content-processing.ts`): Processes each type appropriately
- **Transcript Chunking** (`transcript-chunking.ts`): Smart chunking with boundaries
- **Field Formatting** (`field-formatting.ts`): Consistent metadata and content formatting
- **Main Formatter** (`index.ts`): Single entry point coordinating all processing
