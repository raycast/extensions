# Agent Coding Guidelines

This is a Raycast extension project built with TypeScript and React.

## Build/Lint Commands

```bash
# Setup
npm install              # Install dependencies

# Development
npm run dev              # Start Raycast development mode
npm run build            # Build extension for production

# Code Quality
npm run lint             # Run ESLint checks
npm run fix-lint         # Auto-fix ESLint issues
npm test                 # Run Node test suite (*.test.ts via --experimental-strip-types)

# Publishing (official Raycast flow — run from this extension directory)
npm run build            # Validate for distribution first
npm run publish          # Open or update PR to raycast/extensions (npx @raycast/api@latest publish)

# If publish fails after remote/GitHub edits or store contributions:
npx @raycast/api@latest pull-contributions
npm run publish
```

### Publishing notes

- Prefer `npm run publish` from this repo. Do **not** hand-edit or force-push the Raycast monorepo fork for routine updates.
- First `publish` opens a PR on [`raycast/extensions`](https://github.com/raycast/extensions); later `publish` runs push more commits to the same PR.
- The CLI may squash commits. For full control, use the manual fork + PR flow described in [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension).
- After someone else contributes or you edit the PR on GitHub, run `pull-contributions` before `publish` again.
- Local git remotes may be empty; publish still syncs via the Raycast CLI + GitHub auth.

## Tech Stack

- **Framework**: Raycast API + React
- **Language**: TypeScript (ES2023, strict mode)
- **Module**: CommonJS
- **Runtime tests**: Node test runner with `--experimental-strip-types`
- **Linting**: ESLint with `@raycast/eslint-config`
- **Formatting**: Prettier (120 char width, double quotes)

## Code Style Guidelines

### Imports

- Use ES6 module syntax with `import`
- Order: React/Raycast imports first, then local modules
- Example: `import { List, Action, Icon } from "@raycast/api";`

### Formatting

- Line width: 120 characters
- Use double quotes for strings
- 2-space indentation
- Semicolons required
- Trailing commas in multi-line

### Types

- Enable `strict: true` in TypeScript
- Use explicit return types for functions
- Leverage Raycast API types
- Avoid `any` type

### Naming Conventions

- Components: PascalCase (e.g., `AgentUsage`)
- Functions: camelCase (e.g., `getUsageData`)
- Constants: UPPER_SNAKE_CASE or camelCase
- Files: camelCase or match component name
- Props interfaces: descriptive names

### Error Handling

- Use try-catch for async operations
- Show user-friendly errors via Raycast's `showToast` or `showHUD`
- Log errors for debugging
- Handle edge cases gracefully

### React Patterns

- Use functional components with hooks
- Prefer composition over inheritance
- Keep components focused and small
- Use `useState`, `useEffect`, `useCallback` appropriately
- Memoize expensive computations with `useMemo`

### Raycast Conventions

- Use Raycast API components: `List`, `Detail`, `Form`, `ActionPanel`
- Provide meaningful titles and subtitles
- Use appropriate icons from `@raycast/api`
- Implement keyboard shortcuts for common actions
- Use `ActionPanel` for user interactions

### File Organization

```
src/
  agent-usage.tsx          # Main list-view command
  agent-usage-menubar.tsx  # Menu bar command
  accounts/                # Multi-account storage, types, and management UI
  agents/
    types.ts               # Shared agent types (AgentDefinition, UsageState, AgentId)
    ui.tsx                 # Shared Detail/Accessory helpers for error/loading/empty
    format.ts              # Shared usage formatting helpers
    hooks.ts               # Shared cached-hook factories (TTL cache lives here)
    provider-hooks.ts      # All provider hook wirings (fetchers + auth + preferences)
    usage-cache.ts         # Pure cache-payload helpers (tested)
    http.ts                # Shared HTTP helpers
    jwt.ts                 # Shared JWT helpers
    opencode-auth.ts       # Shared OpenCode credential helpers
    opencode-active.ts     # Shared OpenCode active-account helpers
  amp/                     # Amp provider (fetcher/parser/renderer/types)
  antigravity/             # Antigravity provider
  claude/                  # Claude provider
  codex/                   # Codex provider, including account/auth helpers
  copilot/                 # Copilot provider
  droid/                   # Droid provider
  gemini/                  # Gemini provider, including reauth/binary helpers
  grok/                    # Grok (xAI) provider — auth.json + grok.com billing
  kimi/                    # Kimi provider
  minimax/                 # MiniMax provider
  opencode-go/             # OpenCode Go provider
  synthetic/               # Synthetic provider
  zai/                     # z.ai / GLM provider
  **/*.test.ts             # Node test-runner tests colocated with modules
assets/
  extension-icon.png       # Extension icon
```

### Minimal Changes Principle

- When modifying code, minimize changes to other modules
- Prefer editing existing files over creating new ones
- Follow existing code patterns and conventions
- Keep PRs focused on single concerns

## Working with Raycast API

Key imports from `@raycast/api`:

- `List` - For searchable lists
- `Detail` - For markdown/text display
- `ActionPanel`, `Action` - For user actions
- `Icon` - For built-in icons
- `showToast`, `showHUD` - For notifications

Key imports from `@raycast/utils`:

- `useFetch`, `useSQL` - Data fetching hooks
- `runAppleScript`, `runShellCommand` - System integration
- `getPreferenceValues` - Access extension preferences

## Agent Architecture Notes

- The list-view registry lives in `src/agent-usage.tsx` as `AGENT_REGISTRY`; keep it in sync with `AgentUsageById`, `AgentErrorById`, preferences in `package.json`, and menu-bar visibility when adding providers.
- The menu-bar command (`src/agent-usage-menubar.tsx`) has separate provider wiring. Add providers there too when they should appear in the menu bar.
- Provider hooks should return a `UsageState<TUsage, TError>` shape for consistency.
- Each provider should keep its `fetcher`, `renderer`, and `types` responsibilities separate. Add `auth`, `parser`, or small utility modules only when the provider already needs that boundary.
- Multi-account providers use `src/accounts` storage/types and usually expose an account-aware hook such as `useKimiAccounts`, `useZaiAccounts`, `useCodexAccounts`, or `useSyntheticAccounts`.
- Reuse shared UI helpers from `src/agents/ui.tsx` for error/loading/empty states before adding custom UI.
- Reuse shared formatting, HTTP, JWT, and OpenCode helpers from `src/agents` before adding provider-local duplicates.
- Provider `fetcher`/`auth`/`parser` modules must not import `@raycast/api` or `src/agents/hooks.ts` (directly or transitively) — the package has no runtime entry outside Raycast, so any such import breaks the Node test runner. Hook wiring, preference reads, and caching live in `src/agents/provider-hooks.ts` and `src/agents/hooks.ts` instead.
