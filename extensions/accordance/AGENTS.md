# AGENTS.md - Raycast Accordance Extension

## Project Overview

Raycast extension (TypeScript + React) integrating with Accordance Bible Software on macOS.
Communicates with Accordance via AppleScript (`runAppleScript` from `@raycast/utils`) and the
`accord://` URL scheme (`open` from `@raycast/api`). No backend server -- all local.

## Build / Lint / Dev Commands

```bash
npm run dev          # Start development mode with hot reload (ray develop)
npm run build        # Production build (ray build)
npm run lint         # Check code style (ray lint)
npm run fix-lint     # Auto-fix lint issues (ray lint --fix)
npm run publish      # Publish to Raycast Store
```

There is **no test framework** configured. No jest, vitest, or similar. No test files exist.
Testing is manual: run `npm run dev`, open Raycast, and exercise commands with various inputs.

## Project Structure

```
src/
  browse-library.tsx       # "Browse Library" command
  get-verses.tsx           # "Get Verses" command
  open-workspace.tsx       # "Open Workspace" command
  read-verses.tsx          # "Read Bible" sequential reader
  search.tsx               # "Search Texts" quick search (no-view command)
  search-advanced.tsx      # "Advanced Search" command
  components/
    ModuleSelector.tsx      # Reusable module dropdown component
    bibleData.ts            # Static Bible book/chapter/verse data
  utils/
    applescriptUtils.ts     # AppleScript generation for Accordance
    bibleUtils.ts           # Reference parsing, validation, normalization
    categories.ts           # Content categories and search scopes
    moduleUtils.ts          # Module discovery, caching, plist parsing
```

Each command file in `src/` corresponds to a command in `package.json` and exports a default
`Command` function. Helper components internal to a command live in the same file.

## Code Style

### Formatting (Prettier)

- **Print width:** 120 characters
- **Quotes:** Double quotes everywhere (`singleQuote: false`)
- **Semicolons:** Always
- **Trailing commas:** Yes (Prettier default)

### ESLint

Uses `@raycast/eslint-config` via flat config in `eslint.config.js`. Run `npm run lint` before
committing.

### TypeScript

- `strict: true` in `tsconfig.json`
- Target/lib: ES2023, module: commonjs, jsx: react-jsx
- No path aliases -- all local imports use relative paths (`./`, `../`)
- Use `interface` (not `type`) for object shapes. PascalCase, no `I` prefix.
- Enums are not used -- prefer typed constant arrays or plain objects.
- Generics used sparingly, mainly with Raycast APIs: `getPreferenceValues<Preferences>()`
- Explicit return types on exported utility functions; omitted on React components.

### Naming Conventions

| Construct        | Convention        | Examples                                  |
| ---------------- | ----------------- | ----------------------------------------- |
| Command files    | kebab-case        | `get-verses.tsx`, `search-advanced.tsx`   |
| Component files  | PascalCase        | `ModuleSelector.tsx`                      |
| Utility files    | camelCase         | `bibleUtils.ts`, `moduleUtils.ts`         |
| Interfaces       | PascalCase        | `ModuleInfo`, `VerseResult`, `BibleBook`  |
| Functions        | camelCase         | `fetchModules`, `validateReference`       |
| React components | PascalCase        | `Command`, `SearchList`, `ModuleSelector` |
| Variables        | camelCase         | `selectedModule`, `searchQuery`           |
| Constants        | SCREAMING_SNAKE   | `CACHE_KEY`, `CACHE_DURATION`             |
| Booleans         | `is`/`has` prefix | `isLoading`, `isExecuting`, `hasMore`     |

### Imports

Order (consistent across all files):

1. `@raycast/api` imports
2. `react` imports
3. `@raycast/utils` imports
4. Local component imports (`./components/...`)
5. Local utility imports (`./utils/...`)

Always use named/destructured imports. Never `import * as`. Double-quoted paths.

### Exports

- **Default exports:** Only for Raycast command entry points (`export default function Command()`)
- **Named exports:** Everything else (utilities, interfaces, constants, reusable components)
- Internal/private functions are simply not exported.

### Functions

- React components: `function` declarations
- Exported utilities: mixed (`function` declarations or `const` arrow functions)
- Event handlers inside components: `const` arrow functions
- Inline callbacks: arrow functions

### Error Handling

- Wrap all async operations in `try/catch/finally`
- Log raw errors with `console.error("descriptive message:", error)`
- Show user-friendly feedback with `showFailureToast("message")` from `@raycast/utils`
- Use `finally` blocks to reset loading/executing flags
- Validate inputs before async work; return early with `showFailureToast` on invalid input
- Graceful fallbacks: when module loading fails, return fallback data instead of throwing
- No custom error types or Result/Either patterns

### State Management

- React `useState` + `useEffect` only. No external state libraries.
- Initialize state from `getPreferenceValues<Preferences>()`, then update async.
- Module-level `Map` for cross-render caching (e.g., `verseCache`).
- Raycast `Cache` API for persistent cross-session caching with TTL (1-hour for modules).
- Use functional state updates when new state depends on previous: `setState((prev) => ...)`

### Comments

- Inline comments: sparingly, for clarification only. No restating code.
- JSDoc with `@param`/`@returns` on exported utility functions in `moduleUtils.ts`.
- Other files: no JSDoc. Keep comments concise, single-line.

## Accordance Integration

Two communication methods:

1. **AppleScript** via `runAppleScript()` -- for verse retrieval (`AccdTxRf` event) and
   module listing (`AccdVerL` event). Accordance launches automatically if not running.
2. **URL scheme** (`accord://`) via `open()` -- for searches, research views, daily reading.

Module discovery reads `Info.plist` from `~/Library/Application Support/Accordance/Modules/`.

## Raycast Patterns

- Use `List` with `isShowingDetail` for split-pane views
- `List.Dropdown` with `storeValue={true}` for persisting user selections
- `ActionPanel` + `Action.CopyToClipboard`, `Action.Push`, `Action.OpenInBrowser`
- `Icon` enum from Raycast for all icons (no custom icon files in JSX)
- `showFailureToast` for errors; `showToast({ style: Toast.Style.Success, ... })` for success
- `openCommandPreferences` from `@raycast/api` for settings access
- Preferences defined in `package.json` under each command's `preferences` array

## Caching Strategy

- Module list: Raycast `Cache` API with 1-hour TTL (`CACHE_DURATION`)
- Verse results: in-memory `Map` keyed by `reference+module`
- Search history: persisted across extension relaunches
- Always check cache before executing AppleScript calls
- Normalize references before cache lookup for consistency

## Copilot Instructions

Additional context is available in `.github/copilot-instructions.md` covering the original
AppleScript architecture, Apple Event codes, and migration notes from macOS Automator.
