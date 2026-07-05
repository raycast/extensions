# NewAPI Helper — Agent Guide

This doc helps AI coding agents understand the project structure, conventions, and common workflows.

## Tech Stack

- **Runtime**: Raycast API v1
- **UI Framework**: React (JSX) with Raycast components
- **Network**: `@raycast/utils` `useFetch`
- **Storage**: `@raycast/api` `LocalStorage`
- **Package Manager**: npm (lockfile: `package-lock.json`)
- **TypeScript**: v6, `strict: true`, `target: ES2023`

## Project Structure

```
src/
├── apis.tsx              # Main command (list + create/edit form)
├── api-detail.tsx        # Detail dashboard component (imported, not a command)
└── lib/
    ├── types.ts          # Shared type definitions
    ├── storage.ts        # LocalStorage CRUD (getConfigs/saveConfig/deleteConfig)
    └── i18n.ts           # Language detection (en/zh-Hans)
assets/
├── extension-icon.png    # Extension icon (512x512 PNG)
package.json              # Extension manifest + Raycast config
```

## Key Conventions

### Code style
- TypeScript strict mode — no inline casts (`as`). Use type guards or Zod schema.
- React hooks must be called unconditionally — use `execute` option on `useFetch` to skip.
- All UI text must go through the `translations` object + `tr()` / `t()` function for i18n.

### Data flow
1. **Configs** stored in `LocalStorage` key `api-configs` as `ApiConfig[]`
2. **List view** (`apis.tsx`) reads configs on mount via `useConfigs()` hook
3. **Detail view** (`api-detail.tsx`) takes a single `ApiConfig` as prop, fetches both `/api/user/self` and `/api/data/self`
4. **Form** (`ApiForm` inline in `apis.tsx`) validates and saves via `saveConfig()`

### API endpoints
| Endpoint | Purpose | Used by |
|---|---|---|
| `GET /api/user/self` | Account info + balance | `api-detail.tsx` |
| `GET /api/data/self?start_timestamp=&end_timestamp=&default_time=hour` | Hourly usage today | `api-detail.tsx` |

Both use `Authorization: Bearer {accessToken}` and `New-Api-User: {userId}` headers.

### Raycast patterns
- Single command `apis` registered in `package.json`
- Navigation via `Action.Push` for detail view and form
- No extension preferences — all configs managed in-app via LocalStorage
- `useFetch` uses `keepPreviousData: false` and conditional `execute`

## Common Tasks

### Adding a new field to the form
1. Add translation key in `apis.tsx` `translations` object
2. Add `Form.TextField` / `Form.PasswordField` in the `ApiForm` component
3. Add the field to `ApiConfig` in `lib/types.ts`
4. Handle validation in `handleSubmit`

### Adding a new API endpoint
1. Add response type in `lib/types.ts`
2. Add `useFetch` call in `api-detail.tsx`
3. Display data in `buildMarkdown()`

### Adding a new command
1. Create `.tsx` file in `src/`
2. Register in `package.json` `commands` array
3. If it needs preferences, add `preferences` array in the command config
