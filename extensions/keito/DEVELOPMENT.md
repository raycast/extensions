# Developing the Keito extension

The user-facing documentation is in [README.md](README.md), which the Raycast Store shows as "About This Extension". This file covers how the extension works, how to test it, and how to publish it.

This extension is a port of the Harvest Raycast extension by eluce2. [HARVEST-README.md](HARVEST-README.md) describes the original extension, and Git history has its changelog. It talks to the Keito API v2 at `https://app.keito.ai/api/v2` through a small typed adapter in [`src/services/keito`](src/services/keito).

## Commands

```sh
npm ci
npm run test:run        # mocked-API unit and workflow tests
npm run build           # TypeScript check and Raycast build
npm run lint            # ESLint, Prettier, manifest and icon validation
npm run dev             # register the extension in Raycast
npm run check:publish   # what `ray publish` would upload: no secrets, store requirements met
```

## Authentication

### OAuth (default)

- **Flow:** WorkOS Connect, using the authorization code flow with S256 PKCE for a public client, so there's no client secret. The client ID is `client_01M52K79JXK4NXVH05RY87VZ9P`.
- **Endpoints and scopes:** `https://auth.keito.ai/oauth2/authorize` and `/oauth2/token`, with scopes `openid profile email offline_access`.
- **Redirect:** Raycast's static web redirect, `https://raycast.com/redirect?packageName=Extension`. "Extension" is literal, not this extension's package name.
- **Sign-in:** Raycast's `OAuth.PKCEClient` (`RedirectMethod.Web`) generates `state` and the PKCE values. The extension adds a fresh random `nonce` through `extraParameters` and checks it, along with the audience, against the returned ID token.
- **Code exchange:** a form-encoded POST of `grant_type=authorization_code`, `client_id`, `code`, `code_verifier` and the same `redirect_uri`.
- **Refresh:** `grant_type=refresh_token`, `client_id` and `refresh_token`, run 30 seconds before the 5-minute expiry.
- **Rotation:** refresh tokens rotate, and each replacement goes to Raycast's encrypted token storage. Only one refresh runs at a time per process. If another command rotated the token first, its tokens are used instead of signing out.
- **API requests:** `Authorization: Bearer <access token>`, with no `Keito-Account-Id`, because Keito determines the company from the token. After a 401, the extension refreshes once and retries, then reports that you're signed out.
- **When sign-in can start:** only in user-initiated view and no-view commands. The menu bar and background refreshes never start one.

The core logic is in `src/services/keito/oauth.ts`, which has no Raycast dependency and is unit-tested. The Raycast wrapper is `src/services/keitoOAuth.ts`.

### Integration keys

When both preferences are set, requests send `Authorization: Bearer kto_…` and `Keito-Account-Id`. `GET /users/me` must resolve to the same company. Personal read-only sync keys are detected and rejected with an explanation. Keys can only be created in Keito's web app; the API has no endpoint for it.

### Identity and caches

The verified identity is cached under a truncated SHA-256 fingerprint, never the secret itself. For keys, the fingerprint comes from the key and Company ID; for OAuth, from the client ID and the ID token's `sub`. It is re-checked every 6 hours and whenever the credentials or the signed-in account change. Favorites, the last-used project and cached lists are stored per company and user.

## Keito API behaviour

Observed against the live API on 2026-10-15 and 2026-10-16:

- `GET /users/me` returns `company` settings (timezone, `manual_entry_format`, `require_notes`, `allow_past_timer_starts`, rounding) and `capabilities.can_track_time`. These are undocumented. The extension uses them, and falls back gracefully if they disappear.
- `started_time`/`ended_time` come back as `HH:mm:ss`, although the docs say `HH:mm`. The extension reads either and sends `HH:mm`.
- Approved or locked entries return **403** "This time entry is locked…", not the documented 409. Both are treated as locked.
- Keito **accepted a task not assigned to the project**, and an end time before the start. The form lists only the project's tasks and validates times, and favorites check the task before starting.
- A wrong Company ID returns 401 "Invalid API key or company".
- `GET /time_entries/:id` returns 405; the extension doesn't use it.
- `links.next` is relative. Pagination follows it only on the API origin and `/api/v2/` path.
- Starting or restarting a timer while another runs returns `409 running_timer_conflict`. The extension asks before retrying with `replace_running: true`. Toggle Timer and the menu bar never switch timers.
- Rate limits: `Retry-After` is honoured up to 30 seconds, with at most two retries. Server and network errors are retried only for reads, so a write is never sent twice.

## Keito SDK and CLI

Both were evaluated on 2026-10-15 and not used:

- **Node SDK:** `@keito-ai/sdk` 0.1.0 has no stop, restart or `replace_running`. It lacks `approval_status`, and it paginates by page number. The documented package name, `@keito/sdk`, isn't on npm.
- **CLI:** a separate Homebrew/Rust program with no edit, restart or replace-running commands.

## Tests

The unit tests (`npm run test:run`) use scripted API and token-endpoint responses. They cover:

- onboarding errors
- OAuth sign-in, the nonce and audience checks, refresh rotation and concurrent refreshes
- credential changes, pagination and the origin guard
- string IDs and task/project context
- timer conflicts and approval/lock state
- retries, the entry form logic, favorites, and the status file

Mocked tests don't prove the live API behaves the same; the live tests below cover that.

Live tests read `KEITO_API_KEY` and `KEITO_ACCOUNT_ID` from `~/.config/keito-raycast/live.env`, or from the file named in `KEITO_ENV_FILE`. **Never put credentials inside the extension folder.** `ray publish` copies the whole folder into a public pull request and ignores `.gitignore`.

- `npm run test:live` is read-only. It checks identity, both bad-credential responses, project pagination, tasks, and time-entry shapes. It prints only field names, counts and statuses.
- `npm run test:live:write` is for a test workspace only. It creates entries whose notes start with `[raycast-live-test …]`, then exercises edit, re-time, start, the conflict and confirmed switch, stop, restart, toggle and delete. It finishes by deleting everything it created. A timer you had running beforehand is stopped and then restarted.

Fake keys in tests start with `kto_FAKE_`, so the publish check can still catch real ones.

## Icons

The extension icon shows the Keito mark in white on Keito's brand colour `#5046E5`. The mark ([`scripts/keito-mark.svg`](scripts/keito-mark.svg)) was traced from the official logo at `https://keito.ai/images/keito-logo.png`. The site's `favicon.svg` is a cramped variant and isn't used. The command icons are the inherited glyphs, recoloured to the same colour.

`node scripts/generate-icons.js` regenerates every icon. Output file names include the colour, because Raycast caches images by file name.

## Publishing to the Raycast Store

`npm run publish` runs the unit tests, lint, build and `check:publish`, then `npx @raycast/api@latest publish`. That command authenticates with GitHub and opens a pull request on [`raycast/extensions`](https://github.com/raycast/extensions). Raycast reviews it and publishes the extension when it's merged. Running `npm run publish` again pushes more commits to the same PR. The extension `name` is `keito` and `author` is `eluce2`, which must be the publisher's Raycast username.

Before the first submission:

1. Add 3–6 screenshots to `metadata/` (recommended, not required), using Raycast's Window Capture → **Save to Metadata** (2000×1250 PNG). Use the same background throughout and show no other apps or sensitive data.
2. Make sure `CHANGELOG.md` has an entry dated `{PR_MERGE_DATE}`.
3. Run `npm run check:publish`.

## Live acceptance checklist

Steps marked ✎ change timesheet data.

1. **Keito Connection** signs in with Keito and passes all four checks. Optionally, try an integration key with a wrong Company ID, then a personal read-only sync key; each should show its own explanation.
2. **New Time Entry** groups projects by client, and changing the project reloads its tasks.
3. ✎ Start a timer with a blank duration. The menu bar shows it after a refresh.
4. ✎ Start a second timer. The switch prompt names the first one. **Cancel** keeps it; **Stop and Switch** replaces it.
5. ✎ Stop the timer from the menu bar, then use **Toggle Timer** twice (restart, then stop).
6. ✎ Log a completed entry, edit its notes and duration, duplicate it, and delete the duplicate.
7. View yesterday (⌘←). ✎ Use **Start on Today** on an entry.
8. ✎ Add a favorite with a duration and one without, and use both.
9. Approved entries show an *Approved* tag and lock icon, with no edit or delete actions.
10. Set a status folder and confirm `currentTimer.json` appears while a timer runs and disappears after it stops.
