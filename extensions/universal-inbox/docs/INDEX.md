# Documentation Index

## Token Estimates

| File | Tokens | Load When |
|------|--------|-----------|
| `CLAUDE.md` | ~350 | Always |
| `.claude/COMMON_MISTAKES.md` | ~300 | Always |
| `.claude/QUICK_START.md` | ~250 | Always |
| `.claude/ARCHITECTURE_MAP.md` | ~350 | Always |
| **Session start total** | **~1,250** | |
| `docs/learnings/raycast-patterns.md` | ~400 | UI/component work |
| `docs/learnings/api-integration.md` | ~350 | API calls, fetch, error handling |
| `docs/learnings/adding-integrations.md` | ~400 | New integration |
| **Typical task total** | **~1,650–1,850** | |

## Navigation by Task

### Adding a new notification action

1. `.claude/COMMON_MISTAKES.md` — mistakes 2, 3, 4
2. `docs/learnings/api-integration.md` — PATCH endpoint patterns
3. Reference: `src/action/NotificationActions.tsx`

### Adding a new integration

1. `.claude/QUICK_START.md` — "Adding a New Integration" section
2. `docs/learnings/adding-integrations.md` — full walkthrough
3. Reference existing: `src/integrations/linear/`

### Debugging fetch / API errors

1. `.claude/COMMON_MISTAKES.md` — mistakes 1, 2, 7
2. `docs/learnings/api-integration.md` — error handling patterns

### UI / list item work

1. `docs/learnings/raycast-patterns.md` — List, ActionPanel, accessories
2. Reference existing: `src/integrations/github/listitem/`

### Understanding the data model

1. `.claude/ARCHITECTURE_MAP.md` — Key Types table
2. `src/notification.ts`, `src/third_party_item.ts`

## Before/After Token Comparison

| Scenario | Before (no docs) | After |
|----------|-----------------|-------|
| Session start (guessing patterns) | 8,000+ | ~1,250 |
| Adding new integration | 12,000+ | ~1,850 |
| Debugging API issue | 6,000+ | ~1,600 |
