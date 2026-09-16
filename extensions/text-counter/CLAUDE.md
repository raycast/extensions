# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension that counts text statistics (lines, words, characters, and tokens) from clipboard content. It's built with TypeScript and React using the Raycast API.

## Key Commands

### Development
```bash
npm install          # Install dependencies
npm run dev         # Start development mode (watch mode)
npm run build       # Build the extension for production
```

### Code Quality
```bash
npm run lint        # Run ESLint
npm run fix-lint    # Auto-fix linting issues  
```

### Publishing
```bash
npm run publish     # Publish to Raycast Store
```

## Architecture

### Core Structure
- **Single Command Extension**: The extension has one command `count-text` defined in `package.json`
- **Main Component**: `src/count-text.tsx` - Contains all the counting logic and UI in a single React component
- **Token Counting**: Uses `gpt-tokenizer` library for GPT/Claude token counting (currently all models use the same tokenizer)

### Key Technical Details
- **Framework**: Raycast API with React components (`List`, `Detail`, `ActionPanel`, etc.)
- **State Management**: React hooks (`useState`, `useEffect`) for local state
- **Clipboard Access**: Uses `@raycast/api` Clipboard API for reading text
- **User Feedback**: Toast notifications for success/error states
- **Formatting**: Numbers are formatted with locale-specific separators using `toLocaleString()`

### Code Conventions
- **TypeScript**: Strict mode enabled, interfaces for type safety
- **Component Structure**: Single file component with all logic self-contained
- **Error Handling**: Try-catch blocks with user-friendly toast notifications
- **Actions**: Each list item has its own ActionPanel with copy and refresh actions
- **Shortcuts**: Cmd+R for refresh from clipboard

## Raycast Extension Configuration
- **Extension Type**: View mode command (not no-view or menu-bar)
- **Permissions**: Clipboard read access required
- **Icons**: Uses Raycast's built-in Icon components
- **Build System**: Uses `ray` CLI for building and development