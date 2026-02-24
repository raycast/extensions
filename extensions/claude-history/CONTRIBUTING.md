# Contributing

Thanks for your interest in contributing to Claude History!

## Getting Started

1. Fork the repo and clone it locally
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open Raycast and search for "Claude History" to test

## Development

- Source code is in `src/`
- The extension reads data from `~/.claude/` (read-only, never writes to Claude files)
- Session data is parsed from JSONL files under `~/.claude/projects/`

### Project Structure

```
src/
  claude-history.tsx          # Main command entry point
  lib/
    constants.ts              # Paths and config values
    types.ts                  # TypeScript types
    claude-data.ts            # Project/session discovery
    session-parser.ts         # JSONL parser (sync, memory-safe)
    formatters.ts             # Path decoding, markdown formatting
    favourites.ts             # LocalStorage-backed favourites
    actions.ts                # Clipboard/Finder/VS Code helpers
  components/
    SessionListItem.tsx       # Session row with detail panel
    SessionDetail.tsx         # Full conversation view
    ProjectListItem.tsx       # Project row with drill-down
```

### Performance Notes

- Session scanning reads only the first 16KB of each JSONL file
- Total sessions scanned is capped at 60 to stay within Raycast's memory limits
- All data discovery is synchronous to avoid stream buffering issues
- Detail previews load lazily only for the selected session

## Submitting Changes

1. Create a branch for your change
2. Make your changes
3. Run lint:
   ```bash
   npm run lint
   ```
4. Test the extension in Raycast via `npm run dev`
5. Commit using [conventional commits](https://www.conventionalcommits.org/):
   ```
   feat: add new feature
   fix: resolve bug
   chore: update dependency
   ```
6. Open a pull request

## Reporting Issues

Open an issue on GitHub with:
- What you expected to happen
- What actually happened
- Your macOS version and Raycast version
