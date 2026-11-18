# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # development mode with hot reload
npm run build      # production build
npm run lint       # eslint check
npm run fix-lint   # auto-fix linting issues
```

## Architecture

Raycast extension for managing FileMaker Pro code snippets via FmClipTools (AppleScript).
Raycast extension documentation: https://developers.raycast.com/

### Core Flow

1. **Clipboard capture**: FmClipTools reads FM clipboard → converts to XML
2. **Storage**: Snippets saved as JSON files (local dirs or git repos)
3. **Usage**: XML written back to clipboard via AppleScript → paste in FM Pro

### Key Files

- `src/utils/types.ts` - Zod schemas for Snippet, Location, SnippetType
- `src/utils/snippets.ts` - Snippet I/O, clipboard integration, file operations
- `src/utils/FmClipTools.ts` - AppleScript wrapper for FM clipboard ops
- `src/utils/use-locations.ts` - Location management, git clone/pull
- `assets/FmClipTools/` - AppleScript utilities (v4.0.4)

### Snippet Types

script, scriptSteps, layout, group, field, customFunction, baseTable, valueList, layoutObjectList, unknown

### Storage Locations

- Default: `~/.config/Raycast/com.raycast.raycast/extensions/filemaker-snippets/snippets`
- Git repos cloned to: `~/.config/.../filemaker-snippets/git/{id}/`
- UUID-based filenames

### Dynamic Snippets

Template substitution with text/dropdown fields - form generated at usage time, replaces placeholders in XML.

## Conventions

- Zod for runtime validation
- Raycast hooks: useCachedPromise, useCachedState
- Double quotes (Prettier config)
- Strict TypeScript

## Changelog Requirements

With each modification, provide clear and descriptive details regarding the latest update, accompanied by a title formatted as an h2 header followed by {PR_MERGE_DATE}. This placeholder will be automatically replaced when the pull request is merged. While you may still use the date timestamp format YYYY-MM-DD, it is often more practical to use {PR_MERGE_DATE} since merging of a pull request can take several days (depending on the review comments, etc.).

Make sure your change title is within square brackets

Separate your title and date with a hyphen - and spaces either side of the hyphen
