# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Raycast extension ("App Store Connect") that lets users manage App Store Connect from Raycast: app status/release, TestFlight builds, beta groups (internal/external), individual testers, test information, and team members — across multiple App Store Connect API teams.

## Commands

- `npm run dev` (`ray develop`) — run the extension locally in Raycast for interactive testing.
- `npm run build` (`ray build -e dist`) — production build.
- `npm run lint` / `npm run fix-lint` (`ray lint [--fix]`) — ESLint via `@raycast/eslint-config`; this is the only lint/typecheck path (no separate `tsc` script, no test suite/framework in this repo).
- `npm run publish` — publish to the Raycast Store (`npx @raycast/api@latest publish`). `prepublishOnly` deliberately blocks `npm publish` to npm.

There is no test suite. Verify changes by running `npm run dev` and exercising the relevant Raycast command, plus `npm run lint`.

## Architecture

**Six Raycast commands** are the entry points, declared in `package.json#commands` and implemented as top-level `src/*.tsx` files (`appStatus`, `testFlightBuilds`, `testInformation`, `showGroups`, `teamMembers`, `manageTeams`). Each wraps its view in `SignIn` (`src/Components/SignIn.tsx`), which gates all commands on having at least one configured team.

**Auth/team model (`src/Model/useTeams.tsx`)**: Users add one or more "teams" (Issuer ID + API Key + base64-encoded private key), persisted in Raycast `LocalStorage` under keys `"teams"` (array) and `"currentTeam"`. There is no `node-app-store-connect-api` SDK usage despite the dependency — API calls are hand-rolled.

**API layer (`src/Hooks/useAppStoreConnect.tsx`)**:
- `getBearerToken()` reads the *current* team's credentials from `LocalStorage`, decodes the base64 private key, and signs a short-lived (20 min) ES256 JWT with `jose` for the App Store Connect API.
- `fetchAppStoreConnect(path, method, body)` is the raw fetch wrapper (base URL `https://api.appstoreconnect.apple.com/v1`); throws `ATCError` (title/detail) on non-OK responses shaped like ASC's `{ errors: [...] }`.
- `useAppStoreConnectApi<T>(path, mapResponse, loadAll?)` is the hook most views use: manages loading/error state, auto-follows `links.next` cursor pagination (or exposes a `Pagination` for Raycast's `List`/`Grid` `pagination` prop when `loadAll` is not set), and accumulates paged array results into `data`.

**Validation (`src/Model/schemas.ts`)**: All API response shapes are defined as Zod schemas (`appSchema`, `buildSchema`, `betaGroupSchema`, etc.) with inferred TS types exported alongside. New endpoints should follow this pattern — add a schema, parse the response, export the type — rather than typing API responses ad hoc.

**Components (`src/Components/`)** are organized by feature/screen, not by shared UI primitives (e.g. `BetaGroupsList`/`BetaGroupDetail`/`CreateNewGroup` for beta groups, `BuildList`/`BuildDetail`/`BuildItem` for builds, `AddIndividualTester`/`IndividualTestersList` for testers). Follow the existing List → Detail/Item → Action-driven-mutation pattern when adding features: list views use `useAppStoreConnectApi` for reads, mutation forms call `fetchAppStoreConnect` directly and then re-trigger the parent list's fetch.

**Error presentation**: use `presentError` from `src/Utils/utils.ts` to surface `ATCError`/generic errors as Raycast toasts consistently, rather than calling `showToast` directly in feature code.
