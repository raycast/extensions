# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MarkMarks is a Raycast extension for macOS that manages bookmarks using a markdown file as the persistence layer. Built with TypeScript and React.

## Commands

```bash
npm run dev       # Start development server (ray develop)
npm run build     # Build for production (ray build)
npm run lint      # Lint code
npm run fix-lint  # Auto-fix linting issues
```

## Architecture

The codebase has two commands and a shared library:

**Commands** (`src/`):
- `list-bookmarks.tsx` - Main UI for browsing, searching, editing, and deleting bookmarks
- `add-bookmark.tsx` - Captures active browser tab and saves as bookmark

**Library** (`src/lib/`):
- `types.ts` - Core interfaces: `Bookmark`, `BookmarkGroup`, `ParsedBookmarks`, `ActiveTab`
- `bookmarks-parser.ts` - Parses markdown into tree structure using regex patterns
- `bookmarks-writer.ts` - Line-based file editing for add/edit/delete/move operations
- `browser.ts` - AppleScript integration to get active tab from Safari, Chrome, or Arc

## Key Concepts

**Line-based editing**: Each bookmark stores its line number. Edits are performed by reading the file, modifying specific lines, then writing back. This enables surgical edits without re-parsing.

**Group hierarchy**: Markdown headings (h1-h6) define nested groups. The parser maintains a stack to build the tree structure.

**Markdown format**:
- Groups: `# Group Name` (h1-h6 for nesting)
- Bookmarks: `- [Title](url) - description` (description optional)

## Extension Configuration

The user configures the bookmarks file path in Raycast preferences. Access via:
```typescript
import { getPreferenceValues } from "@raycast/api";
const { bookmarksFile } = getPreferenceValues<{ bookmarksFile: string }>();
```
