# AGENT.md - Amp dash x Raycast Extension

## Build/Lint/Test Commands

- **Build**: `npm run build` (builds to dist/ via `ray build -e dist`)
- **Dev**: `npm run dev` (starts Raycast development mode via `ray develop`)
- **Lint**: `npm run lint` (runs Raycast ESLint)
- **Fix Lint**: `npm run fix-lint` (auto-fixes lint issues via `ray lint --fix`)
- **Publish**: `npm run publish` (publishes extension to Raycast store)

## Architecture

- **Type**: Raycast extension for executing Amp AI prompts with `-x` flag
- **Commands**: 4 main commands (runPrompt, addPrompt, managePrompts, runAdhocPrompt)
- **Storage**: LocalStorage API for prompt persistence (`src/lib/storage.ts`)
- **Execution**: Child process spawning for `amp -x` commands (`src/lib/amp.ts`)
- **Components**: Shared PromptList and PromptForm components (`src/components/`)

## Code Style

- **TypeScript**: Relaxed strict mode (`strict: false`), CommonJS modules, ES2019 target
- **React**: JSX via `react-jsx`, no explicit React imports needed
- **ESLint**: Uses `@raycast/eslint-config` standard
- **Error Handling**: Custom AmpError class for amp command failures
- **Imports**: Raycast API imports, Node.js child_process for execution
- **Naming**: camelCase for files/variables, PascalCase for components/interfaces
- **Types**: Explicit interfaces (Prompt, Preferences), optional properties with `?`
