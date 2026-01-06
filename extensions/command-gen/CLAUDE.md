# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (hot reload)
npm run build    # Build extension
npm run lint     # Validate package.json, icons, ESLint, Prettier
npm run fix-lint # Auto-fix lint issues
npm run publish  # Publish to Raycast Store
```

## Architecture

This is a Raycast extension that generates CLI commands from natural language using AI (Claude Haiku or Gemini Flash Lite).

**Single command**: `src/generate-command.tsx` contains all logic:

- **UI**: List component with search bar for input, shows "Generate Command" item + history
- **AI abstraction**: `callAI()` handles both Anthropic and Google AI SDKs based on user preference
- **Context gathering**: `gatherContext()` collects selected text (via Raycast API), previous app name, and current directory (via AppleScript) to enhance prompts
- **Context filtering**: Only includes context from relevant apps (terminals, editors) via `RELEVANT_APPS` set
- **History**: Stored in Raycast's LocalStorage, filtered as user types, max 20 items

**Key UX behavior**: When selecting a history item, `setSearchText` is called followed by `setTimeout(() => setListKey(...), 0)` to ensure the search text commits before the List remounts. This resets selection to "Generate Command" so Enter generates immediately.

## Preferences (defined in package.json)

- `model`: Dropdown to select Claude Haiku 4.5 or Gemini Flash 2.5 Lite
- `anthropicApiKey`: Password field for Anthropic API
- `googleApiKey`: Password field for Google AI API
