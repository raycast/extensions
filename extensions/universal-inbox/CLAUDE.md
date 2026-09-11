# Universal Inbox Raycast Extension

Raycast extension to list and manage Universal Inbox notifications (GitHub, Linear, Slack, Google Mail, Todoist) via the Universal Inbox REST API.

## Session Start Protocol

**MANDATORY** — load these ~800 tokens at session start:
- `CLAUDE.md` (this file)
- `.claude/COMMON_MISTAKES.md` ⚠️ CRITICAL
- `.claude/QUICK_START.md`
- `.claude/ARCHITECTURE_MAP.md`

**Then load task-specific docs** (~500–1500 tokens):
- See `docs/INDEX.md` for navigation by task type

**NEVER auto-load:**
- `.claude/completions/**` — only on explicit request
- `.claude/sessions/**` — only on explicit request
- `docs/archive/**` — only on explicit request

## Quick Start

```bash
ray develop          # dev mode with hot reload
ray build -e dist    # production build
ray lint             # ESLint check
ray lint --fix       # auto-fix lint
prettier --write src # format
```

## Architecture Quick Reference

```
src/
  index.tsx                    # Entry: List command, NotificationKindDropdown
  api.ts                       # handleErrors() — wraps fetch with ts-pattern
  notification.ts              # Notification type, NotificationSourceKind enum
  task.ts                      # Task type, TaskStatus enum
  third_party_item.ts          # ThirdPartyItem union type, getThirdPartyItemHtmlUrl()
  types.ts                     # Page<T>, UniversalInboxPreferences
  action/                      # Shared action panels
    NotificationActions.tsx    # Main ActionPanel with all notification actions
    CreateTaskFromNotification.tsx
    LinkNotificationToTask.tsx
    NotificationTaskActions.tsx
    PlanTask.tsx
  integrations/<name>/
    types.ts                   # Integration-specific types
    accessories.ts             # List item accessories (optional)
    listitem/                  # *NotificationListItem.tsx
    preview/                   # *Preview.tsx
```

## Key Patterns

**Fetch + mutate**: always use `useFetch` from `@raycast/utils`; pass `mutate` down to actions for optimistic updates.

**API calls in actions**: use `node-fetch` + `handleErrors()` wrapper; call inside `mutate(handleErrors(fetch(...)), { optimisticUpdate })`.

**Preferences**: `getPreferenceValues<UniversalInboxPreferences>()` — `apiKey` + `universalInboxBaseUrl` (strip trailing slash).

**New integration**: add `types.ts`, `listitem/`, `preview/` under `src/integrations/<name>/`; add case to `NotificationListItem` switch; add dropdown item.

## Testing

No test suite. Validate by running `ray develop` and exercising the extension in Raycast.

```bash
ray lint && ray build -e dist   # static validation
```

## Code Style

- TypeScript strict mode (`tsconfig.json`)
- Prettier + ESLint via `@raycast/eslint-config`
- `ts-pattern` for exhaustive matching over union types
- No inline API calls — use `handleErrors(fetch(...))` pattern
- `bun`/`bunx` preferred over `npm`/`npx`

## Documentation Navigation

| Need | File |
|------|------|
| Commands & workflows | `.claude/QUICK_START.md` |
| File locations | `.claude/ARCHITECTURE_MAP.md` |
| Mistakes to avoid | `.claude/COMMON_MISTAKES.md` |
| Raycast API patterns | `docs/learnings/raycast-patterns.md` |
| API integration | `docs/learnings/api-integration.md` |
| Adding integrations | `docs/learnings/adding-integrations.md` |
| All docs index | `docs/INDEX.md` |
