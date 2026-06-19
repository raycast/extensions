# Agent Coding Guidelines

This is a Raycast extension project built with TypeScript and React.

## Build/Lint Commands

```bash
# Development
npm run dev              # Start Raycast development mode
npm run build            # Build extension for production

# Code Quality
npm run lint             # Run ESLint checks
npm run fix-lint         # Auto-fix ESLint issues

# Publishing
npm run publish          # Publish to Raycast Store (uses npx @raycast/api@latest)
```

## Tech Stack

- **Framework**: Raycast API + React
- **Language**: TypeScript (ES2023, strict mode)
- **Module**: CommonJS
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
  agent-usage.tsx    # Main entry point (commands defined in package.json)
  agents/
    types.ts         # Shared agent types (AgentDefinition, UsageState)
    ui.tsx           # Shared Detail/Accessory helpers for error/loading/empty
  amp/               # Amp provider (fetcher/parser/renderer/types)
  codex/             # Codex provider (fetcher/renderer/types)
  # Add more command files as needed
assets/
  extension-icon.png # Extension icon
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

- Agent configuration lives in `src/agent-usage.tsx` as `AGENTS` and should include `settingsUrl` when available.
- Provider hooks should return a `UsageState<TUsage, TError>` shape for consistency.
- Reuse shared UI helpers from `src/agents/ui.tsx` for error/loading/empty states before adding custom UI.
