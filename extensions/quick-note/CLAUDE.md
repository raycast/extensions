# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development mode with hot reload
npm run build      # Build the extension
npm run lint       # Lint the code
npm run fix-lint   # Auto-fix lint issues
npm run publish    # Publish to Raycast Store
```

There are no unit tests in this project.

## Architecture

This is a [Raycast](https://raycast.com) extension for the **Quick Note** macOS menu bar app. It communicates with the app exclusively via AppleScript using the `run-applescript` package.

### Commands

- **`new-note`** (`no-view` mode) — Takes `title` and `content` as Raycast arguments, calls AppleScript to create a note, then closes the window. No UI rendered.
- **`search-notes`** (`view` mode) — Renders a `<List>` that re-fetches on every search text change. Fetches folders and notes via two separate AppleScript calls, then renders sectioned (favorites + folders) or flat depending on note metadata.

### Key files

- `src/utils.ts` — Shared utilities. The `escaped()` function must be used when interpolating any user input into AppleScript strings to escape backslashes and double quotes.
- `src/note-list-item.tsx` — Exports the `Note` type and `NoteListItem` component. Opening a note uses the `quicknote://open-note?uuid=` URL scheme.
- `raycast-env.d.ts` — Auto-generated from `package.json` manifest. Do not edit manually; it defines `Arguments.NewNote` and related types used in command props.

### AppleScript integration

The Quick Note app returns note data as JSON from AppleScript (`json of n`). Multiple notes come back as comma-separated JSON objects (not a valid JSON array), so the code manually wraps them: `"[" + result + "]"`.
