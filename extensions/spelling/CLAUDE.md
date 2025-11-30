# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (hot-reload in Raycast)
npm run build        # Build for production
npm run lint         # Run ESLint and Prettier
npm run fix-lint     # Auto-fix lint issues
npm run publish      # Publish to Raycast Store
```

## Architecture

This is a Raycast extension that provides spell checking using macOS's native `NSSpellChecker` API.

### Core Flow

1. User types a word in the Raycast search bar
2. `useExec` hook runs `osascript` with AppleScript that calls `NSSpellChecker`
3. AppleScript returns "CORRECT" or "INCORRECT" on first line, followed by suggestions
4. Results are displayed as a `List` with actions to paste or copy the selected word

### Key Technical Details

- **Spell checking**: Uses AppleScript bridge to `NSSpellChecker.sharedSpellChecker()` via `osascript`
- **AppleScript execution**: Each `-e` flag passes one line of AppleScript (avoids shell escaping issues with multi-line strings)
- **Preferences**: Defined in `package.json` under `preferences` array, accessed via `getPreferenceValues<Preferences>()`

### Preferences Interface

```typescript
interface Preferences {
  primaryAction: "paste" | "copy";
  showHud: boolean;
  closeAfterAction: boolean;
  showSuggestionsForCorrectWords: boolean;
  language: string;  // e.g., "en", "es", "fr"
}
```
