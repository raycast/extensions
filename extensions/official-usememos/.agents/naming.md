# Naming

- **camelCase for identifiers and file names**: `instanceUrl.ts`,
  `errors.ts`. Two exceptions:
  - **Command entry files are kebab-case and match the manifest `name`**:
    `setup.tsx`, `create-memo.tsx`.
  - **React component files are PascalCase**: `SetupGuide.tsx`.
- **Hooks are `useX.ts`**: `useConnectionCheck.ts`.
- **Booleans start with `is`, `has` or `can`**: `isLoading`, `hasAccess`.
- **UPPER_SNAKE for constants**, with numeric separators for large numbers:
  `const DEFAULT_INSTANCE_URL = "https://demo.usememos.com"`,
  `const REQUEST_TIMEOUT_MS = 10_000`.
- **PascalCase for types and classes**: `MemosConnection`, `ApiError`.
- **Command titles are Title Case verb phrases**: "Setup Memos",
  "Search Memos".

## Title case (Apple Style Guide)

Raycast's review checks this. Capitalize every word except articles (`a`,
`an`, `the`), coordinating conjunctions (`and`, `but`, `or`, `nor`, `for`,
`so`, `yet`) and prepositions of four letters or fewer (`at`, `by`, `in`,
`of`, `on`, `to`, `up`, `via`, `with`) — unless the word is first or last.

- ✅ `Search Memos`, `Save Clipboard as Memo`, `Open in Memos`
- ❌ `Search memos`, `Save Clipboard As Memo`, `copy content`
- 🤔 Names canonically written lower case keep it: `iOS`, `macOS`, `npm`.

This applies to the extension title, every command title, every preference
title and every `Action` title. `ray lint` enforces it for `Action` titles;
`pnpm store-check` enforces it for the manifest.

## Command titles and subtitles

- **`<verb> <noun>` or `<noun>`**: `Create Memo`, `Translate`. Not
  `Memo Creation`, not `New Memo`.
- **No articles**: `Create Issue`, never `Create an Issue`.
- **Subtitles add context, they don't describe.** A subtitle that repeats a
  word from its own title should be deleted, not reworded.
