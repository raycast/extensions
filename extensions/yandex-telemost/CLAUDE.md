# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Live-reload development mode (Raycast must be running)
npm run build      # Production build
npm run lint       # Lint with ESLint
npm run fix-lint   # Auto-fix lint issues
npm run publish    # Publish to Raycast Store
```

## Architecture

This is a [Raycast](https://raycast.com) extension with three commands, all backed by a single shared module:

- **`src/create-meeting.ts`** — core logic for creating a meeting. Opens `https://telemost.yandex.ru` in a browser, uses AppleScript to inject JavaScript that clicks the "Создать" button, then polls the active tab's URL until it detects a `https://telemost.yandex.ru/j/` prefix (up to 30 s), and copies the URL to clipboard.
- **`src/new-meeting.ts`** — no-view command; calls `createMeeting(false)`.
- **`src/new-meeting-refocus.ts`** — no-view command; calls `createMeeting(true)`, which saves the frontmost app before opening the browser and restores focus afterward.
- **`src/join-meeting.tsx`** — view command with a form; normalizes bare codes, `j/` prefixes, and full URLs, then opens the result.

### Browser automation

`create-meeting.ts` supports two AppleScript families (`chromium` | `safari`). The `BROWSERS` map drives which family is used per app name. When the user has no preferred browser configured, the frontmost app after `open()` is used. If "JavaScript from Apple Events" is not enabled, the error is caught and a human-readable setup instruction is shown.

### Preferences

One extension-level preference (`browser`: `appPicker`, optional) lets users pin a specific browser; otherwise the active browser is auto-detected.
