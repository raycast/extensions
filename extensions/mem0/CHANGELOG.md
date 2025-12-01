# Mem0 Changelog

## [Update Extension] - {PR_MERGE_DATE}

- Refactored code to use the official `mem0ai` SDK and centralized API logic in `src/utils.ts`.
- Added custom hooks in `src/hooks.ts` (`useClipboardText`, `useGetMemories`, `useSearchMemories`) for data fetching and state management.
- Improved TypeScript types and interfaces in `src/types.ts` for better type safety.
- Refactored command UIs (`add-memories`, `get-memories`, `search-memories`) to use hooks and provide improved UX and error handling.
- Updated dependencies and ESLint config; added Windows platform support and updated contributors in `package.json`.

## [Updated README] - 2025-03-26

- Updated README with a new explanation of how Mem0 works and how it can benefit you.

## [Initial Version] - 2025-03-26
