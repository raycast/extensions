# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server (hot reload in Raycast)
npm run build      # Production build
npm run lint       # ESLint check
npm run fix-lint   # ESLint auto-fix
npm test           # Run all Jest tests
npm test -- --testPathPattern=buildDqlQuery  # Run a single test file
```

## Architecture

This is a **Raycast extension** for Dynatrace observability. It connects to Dynatrace Grail (next-gen storage) via OAuth 2.0 client credentials and DQL (Dynatrace Query Language).

### Entry points

Each `src/dt-*.tsx` file is a thin re-export that maps to a Raycast command declared in `package.json`. The actual implementation lives under `src/commands/<name>/`. The `dt` command (`src/commands/dt/index.tsx`) is a hub that navigates inline to all other commands via `useNavigation().push`.

### Data flow

1. **Auth** — `src/lib/auth.ts` obtains OAuth tokens from `ssoEndpoint` using `client_credentials` grant. Tokens are cached in Raycast `Cache` with a 30-second proactive refresh.
2. **Tenant config** — `src/lib/tenants.ts` persists `TenantConfig` objects in Raycast `LocalStorage` (`tenants:v1` key). `getActiveTenant()` returns the active one; falls back to first tenant if none selected.
3. **Query** — `src/lib/query.ts` exports `useDynatraceQuery<T>()`, the single React hook used by every command. It hits `POST /platform/storage/query/v1/query:execute`. Response shape is validated with Zod (`grailResponseSchema` in `src/lib/types/grail.ts`).
4. **DQL building** — `src/lib/utils/buildDqlQuery.ts` constructs DQL strings. User input is escaped via `escapeDqlString()` before interpolation. The `extraFilter` field is intentionally unescaped (power-user raw DQL).

### Mock / dev mode

Enable **"Use Mock Data"** in Raycast extension preferences (`useMockData`). `isMockMode()` in `src/lib/devMode.ts` reads this flag. `useDynatraceQuery` returns data from `src/lib/api/mock.ts` without any HTTP calls. Query content sniffing (e.g. `query.includes("dt.davis.problems")`) selects the right mock dataset.

### Background commands

- `dt-menubar-problems` — menu-bar command, polls every 5 minutes, shows open problem count.
- `dt-alerts` — no-view command, polls every 5 minutes, sends macOS notifications for new OPEN problems.

### Jira integration

`src/lib/integrations/jira.ts` provides `createJiraIssue()`. Jira credentials (URL, email, API token, project key) are stored as Raycast extension preferences (not in LocalStorage).

### Type structure

- `src/lib/types/grail.ts` — canonical Zod schemas for Grail API responses and log records
- `src/lib/types/{problem,deployment,entity,span,log,savedQuery}.ts` — domain types

### Tests

Tests live in `src/__tests__/` and use Jest + `ts-jest`. Raycast API is mocked in `src/__mocks__/@raycast/api.ts`. Run a single test file with `npm test -- --testPathPattern=<name>`.
