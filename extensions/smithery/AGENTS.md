# AGENTS.md — Raycast Smithery Extension

Guidance for agentic coding agents working in this repository.

---

## Project Overview

A [Raycast](https://raycast.com) extension that surfaces [Smithery](https://smithery.ai) MCP servers
and AI skills. Written in TypeScript + React (Raycast API). No backend — all data is fetched from
the Smithery REST API at runtime or executed via the `smithery` CLI.

Three Raycast commands live at the package root of `src/`:

- `search-mcp-servers.tsx` — browse and install MCP servers
- `search-skills.tsx` — browse and install AI skills
- `manage-installed.tsx` — view and uninstall across clients

---

## Build / Dev / Lint Commands

```bash
# Development (hot-reload in Raycast)
npm run dev         # ray develop

# Production build
npm run build       # ray build -e dist

# Lint + format check (ESLint + Prettier via @raycast/eslint-config)
npm run lint        # ray lint

# Publish to Raycast store
npm run publish     # ray publish
```

> **There is no test suite.** No Jest, Vitest, or any other test runner is configured.
> Manual testing is done inside Raycast itself using `npm run dev`.

---

## TypeScript Configuration

- **Target:** ES2022, `lib: ["ES2022"]`, `types: ["node"]`
- **Module:** Node16 with `moduleResolution: "Node16"`
- **JSX:** `react-jsx` transform (no explicit `React` import needed)
- **Strict mode:** `strict: true` — all strict checks are enabled
- **Key flags:** `esModuleInterop`, `allowSyntheticDefaultImports`, `resolveJsonModule`,
  `forceConsistentCasingInFileNames`, `skipLibCheck`

---

## Linting & Formatting

ESLint flat config in `eslint.config.mjs`:

```js
import raycastConfig from "@raycast/eslint-config";

const baseConfig = Array.isArray(raycastConfig)
  ? raycastConfig.flat()
  : [raycastConfig];

export default [{ ignores: ["raycast-env.d.ts"] }, ...baseConfig];
```

- All rules come from `@raycast/eslint-config` (includes Prettier integration).
- No custom rules or Prettier config file — Prettier defaults apply via the Raycast config.
- Run `npm run lint` to check; the same command auto-fixes what it can.
- `raycast-env.d.ts` is auto-generated from `package.json` — never edit it manually.

---

## Code Style Guidelines

### Formatting

- **Indentation:** 2 spaces (no tabs)
- **Quotes:** double quotes for strings
- **Trailing commas:** yes, in multi-line arrays/objects/params
- **Semicolons:** yes
- **Line length:** follow Prettier defaults (~80-100 chars)
- **Numeric separators:** use `_` for readability (e.g., `15_000`, `120_000`)

### Imports

- Group imports: external packages first, then internal (`src/`) paths.
- Use `node:` prefix for all Node built-ins:
  ```ts
  import { execFile } from "node:child_process";
  import { promisify } from "node:util";
  ```
- No barrel `index.ts` re-exports — import directly from the source file.
- Avoid wildcard imports (`import * as ...`).

### Exports

- **Named exports everywhere** — no default exports except on Raycast command entry-point files
  (e.g., `export default function SearchMcpServers()`).
- Every public utility, hook, component, and constant uses a named export.

### Types

- Prefer `type` aliases for data shapes and component props.
- `interface` is acceptable for shared contracts where it improves readability.
- Keep API/domain models in `src/api/types.ts`.
- Keep file-local props/helper generics close to the component/hook that uses them.
- No `any` — use `unknown` and narrow at runtime if needed.
- No non-null assertions (`!`). Use nullish coalescing (`??`) and optional chaining (`?.`).
- Minimize `as` casts; use them only at narrow boundaries where runtime checks are present
  (e.g., parsing unknown JSON from the API/CLI).

### Naming Conventions

| Construct                   | Convention                   | Example                            |
| --------------------------- | ---------------------------- | ---------------------------------- |
| Files (components)          | PascalCase                   | `McpListItem.tsx`                  |
| Files (hooks)               | `use` prefix, camelCase      | `usePaginatedSearch.ts`            |
| Files (other non-component) | kebab-case or existing style | `local-installs.ts`, `smithery.ts` |
| React components            | PascalCase                   | `McpServerDetail`                  |
| Hooks                       | `use` prefix, camelCase      | `usePaginatedSearch`               |
| Constants (value)           | SCREAMING_SNAKE_CASE         | `PAGE_SIZE`                        |
| Constants (objects/arrays)  | SCREAMING_SNAKE_CASE         | `MCP_CLIENTS`                      |
| Types / Interfaces          | PascalCase                   | `SmitheryServer`, `SearchResult`   |
| Private/local helpers       | camelCase, unexported        | `asRecord`, `buildUrl`             |

### React & Components

- **Functional components only** — no class components.
- Props typed with a local `type` alias directly above the component, not exported unless reused.
- Sub-components used only within one file are defined locally and **not** exported.
- Prefer explicit ternaries over `&&` short-circuit for conditional JSX to avoid rendering `0`.
- Accessory arrays built imperatively (`push`) before passing as props — keeps JSX readable.
- Do not co-locate business logic in JSX — extract to hooks or utility functions.

### Hooks

- Custom hooks go in `src/hooks/`.
- Use `useCallback` and `useMemo` to stabilise references passed as props or deps.
- Use `useEffect` cleanup (`return () => controller.abort()`) for all in-flight fetch cancellation.
- Call async functions inside `useEffect` with the `void asyncFn()` pattern:
  ```ts
  useEffect(() => {
    void load();
  }, [load]);
  ```

### Async / Error Handling

- Use `async/await` exclusively; avoid raw `.then()/.catch()` chains.
- Use `Promise.all` for independent parallel fetches.
- Wrap all async boundaries in `try/catch`.
- Surface errors through Raycast toasts using helpers in `src/utils/toast.ts`.
- Extract error messages with `getErrorMessage` / `getCommandErrorMessage` from `src/utils/error.ts`;
  avoid silent failures, and include clear context when logging diagnostics.
- Set a request timeout via `AbortController` + `setTimeout`; default is `15_000` ms.

### Constants & Configuration

- All constants go in `src/constants/` — never inline magic strings/numbers in components.
- URL construction belongs in `src/constants/urls.ts`.
- CLI command building belongs in `src/constants/commands.ts`.

### File Layout (within a file)

Suggested order:

1. Imports
2. Local type definitions
3. Constants / static data
4. Helper functions (unexported)
5. Exported component / hook / function

---

## Directory Reference

```
src/
├── api/           # Smithery REST API client + shared TypeScript types
├── components/    # Raycast UI components, grouped by feature (mcp/, skills/)
├── constants/     # Static config, URL builders, CLI arg builders
├── hooks/         # Custom React hooks
└── utils/         # Pure utility functions (env, exec, formatting, toasts, errors)
```

---

## Key Dependencies

| Package                  | Role                                                                       |
| ------------------------ | -------------------------------------------------------------------------- |
| `@raycast/api`           | Raycast UI primitives (`List`, `Detail`, `ActionPanel`, `Form`, toasts, …) |
| `@raycast/utils`         | Higher-level hooks and helpers (`usePromise`, `useCachedState`, …)         |
| `@raycast/eslint-config` | ESLint + Prettier ruleset (dev)                                            |
| `typescript`             | Type checking (dev)                                                        |

Runtime dependencies are intentionally minimal — no Zod, no state-management library, no test
framework.

---

## Raycast-Specific Notes

- `raycast-env.d.ts` is **auto-generated** from `package.json`; never edit or delete it.
- The extension targets **macOS only** (`"platforms": ["macOS"]`).
- Requires the **Smithery CLI** (`@smithery/cli`) installed and on `PATH` at runtime —
  checked on load via `src/hooks/useSmitheryCheck.ts`.
- `PATH` is augmented at startup in `src/utils/env.ts` to ensure the CLI is discoverable even when
  launched from Raycast's sandboxed environment.
- Never use `process.exit` or long-blocking operations in command handlers.
