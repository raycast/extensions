# Agent Instructions — Velja Raycast Extension

## Project Overview

This is a Raycast extension for controlling **Velja.app**, a macOS browser router.
It uses TypeScript/React and runs in Raycast's Node.js environment.

## Key Architecture

- **Hybrid integration**: Shortcuts CLI for Velja actions + plist read/write for config/rules
- See `docs/architecture.md` for ADRs
- See `docs/velja-integration.md` for Velja's full integration surface

## Directory Structure

```
src/
  commands/           # One file per Raycast command
  lib/                # Shared utilities
    velja.ts          # Velja detection, plist reading
    shortcuts.ts      # macOS Shortcuts CLI wrapper
    rules.ts          # Rule CRUD (plist read-modify-write)
    types.ts          # TypeScript interfaces for Velja data model
    browsers.ts       # Browser name/icon resolution
  assets/             # Icons
docs/                 # Architecture docs, research
```

## Velja Integration Points

1. **AppIntents via Shortcuts**: `SetDefaultBrowser`, `GetDefaultBrowser`, `SetAlternativeBrowser`, `GetAlternativeBrowser`, `OpenBrowserProfile`, `OpenURLs`, `RemoveTrackingParameters`
2. **Plist** at `~/Library/Preferences/com.sindresorhus.Velja.plist`: stores `rules` (JSON array), `defaultBrowser`, `alternativeBrowser`, `preferredBrowsers`
3. **URL scheme**: `velja://`

## Rules Data Model

```typescript
interface VeljaRule {
  id: string;                     // UUID v4
  title: string;
  browser: string;                // "com.bundle.id" or "com.bundle.id|Profile Name"
  isEnabled: boolean;
  matchers: VeljaMatcher[];
  sourceApps: string[];           // Bundle IDs
  forceNewWindow: boolean;
  openInBackground: boolean;
  onlyFromAirdrop: boolean;
  runAfterBuiltinRules: boolean;
  isTransformScriptEnabled: boolean;
  transformScript: string;
}

interface VeljaMatcher {
  id: string;                     // UUID v4
  kind: "host" | "hostSuffix" | "urlPrefix";
  pattern: string;
  fixture: string;                // Sample URL for testing
}
```

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev mode (hot-reload in Raycast)
npm run build        # Build for production
npm run lint         # Run ESLint
```

## Important Conventions

- Use `child_process.execSync` for shell commands (plist reading, shortcuts)
- Always read-modify-write the entire rules array (atomic updates)
- Generate UUID v4 for new rule and matcher IDs
- Browser identifiers use format: `com.bundle.id` or `com.bundle.id|Profile Name`
- Special markers: `com.sindresorhus.Velja.promptMarker` (prompt), `com.sindresorhus.Velja.defaultBrowserMarker` (system default)
- After plist writes, flush with `killall cfprefsd`

## Testing

- Test against real Velja installation on macOS
- Verify rules appear in Velja UI after programmatic creation
- Check Shortcuts actions work with pre-created Shortcuts in macOS Shortcuts app
