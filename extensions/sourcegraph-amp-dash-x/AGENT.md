# AGENT.md - Amp Raycast Extension

## Build/Lint/Test Commands

- **Dev**: `npm run dev` (`ray develop`)
- **Lint**: `npm run lint`; `npm run fix-lint` fixes what it can
- **Build**: `npm run build` (`ray build`)
- **Types**: `npx tsc --noEmit`

## Architecture

- **CLI**: everything goes through the Amp CLI (`src/lib/amp.ts`): `threads list/search/export/markdown/rename/archive`, `projects list`, `--execute --orb-execute` to start and message threads, and `top --stream-jsonl` for live working state.
- **Commands**: `browse` (Amp home: working, ready, projects, search), `new-thread`, `start-thread`, `ask-puck`, `call-puck`, `open-portal`, `amp` (saved prompts), `categories`, and the `menu-bar` command.
- **Views**: `components/project-view.tsx` and `components/thread-view.tsx` (transcript; the search bar sends messages). `lib/inbox.ts` tracks which finished threads you have seen.
- **Prompts**: `src/lib/prompts.ts` keeps the original LocalStorage keys (`prompts`, `categories`, `initialized`), so saved prompts carry over.

## Code Style

- **TypeScript**: strict mode; Raycast ESLint and Prettier config
- **Naming**: kebab-case files, PascalCase components
