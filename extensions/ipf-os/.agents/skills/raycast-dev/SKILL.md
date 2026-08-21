---
name: raycast-dev
description: Architect, build, review, refactor, and debug Raycast extensions using @raycast/api, @raycast/utils, React declarative UI components (List, Detail, Form, ActionPanel, MenuBarExtra), OAuth PKCE, AI tools, and Raycast CLI workflows. Use when creating new Raycast commands, structuring extension manifests, fixing build/lint errors (ray lint/build), optimizing keyboard actions and caching, or preparing extensions for store publication.
---

# Raycast Extension Development (`raycast-dev`)

Use this skill to design, build, inspect, and polish production-grade Raycast extensions adhering to Raycast's UX standards, performance constraints (<100ms startup), declarative UI architecture, and TypeScript best practices.

---

## Core Workflow

### 1. Inspect Manifest & Command Shape
- Always inspect `package.json` to verify command declarations, modes (`view`, `no-view`, `menu-bar`), arguments, preferences, and AI tools.
- Ensure all command files exist in `src/` matching the manifest `"name"` exactly.
- Keep dependencies updated to latest `@raycast/api` and `@raycast/utils`.

### 2. Choose the Proper UI Component & Layout
- **Browsing & Search**: Use `<List>` with `<List.Item>`, accessories, and tags. Add `<List.EmptyView>` for zero-state handling.
- **Split Master-Detail**: Use `<List isShowingDetail>` with `<List.Item.Detail>` for instant item preview without extra navigation push.
- **Rich Inspection**: Use `<Detail>` with structured `<Detail.Metadata>` and markdown formatting.
- **Data Entry**: Use `<Form>` combined with `useForm` and `FormValidation` from `@raycast/utils`.
- **System Monitoring**: Use `<MenuBarExtra>` with periodic refresh intervals.
- **Background Execution**: Use `mode: "no-view"` with `showHUD` or `showToast`.

### 3. Action Hierarchy & Keyboard Shortcuts
- **Primary Action (Return)**: The first `<Action>` child inside `<ActionPanel>` must be the most intuitive action (e.g. view details, open browser, submit).
- **Secondary Actions (Cmd+K)**: Group actions into `<ActionPanel.Section>` and `<ActionPanel.Submenu>`.
- **Shortcuts**: Use standard shortcut bindings (`Keyboard.Shortcut.Common.Copy`, `Cmd+R` for refresh, `Ctrl+X` / `Cmd+D` with `confirmAlert` for destructive actions).

### 4. Data Fetching, State & Storage
- Prefer high-level hooks from `@raycast/utils`:
  - `useCachedPromise`: Async fetching with persistent disk cache and background revalidation.
  - `useFetch`: Direct REST endpoint querying with pagination.
  - `useCachedState`: Local state persisted across launches.
  - `useExec` / `useSQL`: Local CLI binaries or SQLite database queries.
- Use `LocalStorage` for async KV persistence and `Cache` for synchronous in-memory/disk caching.
- Secure secrets (API keys, tokens) must use `type: "password"` in preferences (stored in macOS Keychain) or `OAuthService` from `@raycast/utils`.

### 5. Verify & Lint Cleanly
- After any TypeScript edits, run `npm run lint` (`ray lint`) and `npm run build` (`ray build`).
- Ensure zero ESLint or TypeScript errors before completing changes.

---

## Command Patterns & Templates

| Command Pattern | File Template | Primary Use Case |
|---|---|---|
| Searchable List | [assets/templates/list-search-command.tsx](assets/templates/list-search-command.tsx) | Filterable collections, tasks, projects |
| Form Submission | [assets/templates/form-submit-command.tsx](assets/templates/form-submit-command.tsx) | Creating tickets, editing records, submitting inputs |
| Detail View | [assets/templates/detail-view-command.tsx](assets/templates/detail-view-command.tsx) | Reading articles, issue specs, formatted markdown |
| Menu Bar Item | [assets/templates/menu-bar-command.tsx](assets/templates/menu-bar-command.tsx) | Status indicators, live metrics, queue counts |
| Quick No-View | [assets/templates/no-view-command.ts](assets/templates/no-view-command.ts) | Background execution, clipboard scripts, HUD triggers |

---

## Deep Dive References

- [Manifest & Command Architecture](references/manifest-and-commands.md) (`package.json`, modes, preferences, AI tools)
- [UI Components & Layouts](references/ui-components-and-layouts.md) (`List`, `Detail`, `Form`, `ActionPanel`, `MenuBarExtra`)
- [Hooks & State Management](references/hooks-and-state-management.md) (`useCachedPromise`, `useFetch`, `LocalStorage`, `Cache`)
- [AI Tools & OAuth Integration](references/ai-tools-and-oauth.md) (`AI.ask`, `useAI`, PKCE `OAuthService`)
- [Quality, Verification & Store Publishing](references/quality-and-publishing.md) (Performance, UX checklist, `ray` CLI)

---

## Common Pitfalls & Anti-Patterns

1. **Heavy Top-Level Imports**: Importing large npm packages or SDKs at module root slows extension launch time (>100ms). Import lazily or use lighter alternatives.
2. **Missing `EmptyView`**: Lists without `<List.EmptyView>` leave a blank screen when filters or searches match zero records.
3. **Improper Action Ordering**: Putting destructive or secondary actions first in `<ActionPanel>` causes accidental execution when users hit `Return`.
4. **Hardcoding Plain Hex Colors**: Use `Color.Green`, `Color.Orange`, `Color.Red`, `Color.SecondaryText`, etc., so Raycast theme adjustments (dark/light) render consistently.
5. **Ignoring `isLoading` State**: Not propagating `isLoading` to `<List>`, `<Detail>`, or `<Form>` makes the UI feel unresponsive while async calls execute.
