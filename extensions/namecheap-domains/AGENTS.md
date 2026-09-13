# Namecheap Domains

A Raycast extension over Namecheap's XML API. Three view commands: `list-domains`, `check-availability`, `register-domain`.

## Commands

Use **npm**. Raycast's CLI supports npm only: `ray validate` and `ray publish` fail outright when a `pnpm-lock.yaml` or `yarn.lock` sits in the working directory, so `package-lock.json` is the one tracked lockfile and `.gitignore` blocks the others as a guard.

Scripts live in `package.json`. `npm run lint` runs ESLint and Prettier together, so formatting needs no separate step.

## Layering

`src/namecheap/` and `src/domain/` are **Raycast-free**: no `@raycast/api` import reaches them. That is what lets the unit tests and `scripts/smoke.ts` exercise the real client in plain Node, with no Raycast app running. Raycast APIs enter at `src/storage.ts`, `src/preferences.ts`, `src/errors.ts` and the command views.

Keep new API and parsing logic on the Raycast-free side.

## Deliberate deviations

Each of these looks like an improvement waiting to happen, and reverting any of them regresses security or privacy.

**Requests go out as POST** (`src/namecheap/client.ts`). A GET puts the API key in the URL, which the CDN in front of the API then logs. A test asserts the key never appears in a URL.

**Data hooks are `usePromise`, never `useCachedPromise`** (`src/hooks.ts`, `src/setup.tsx`). Raycast's own best-practices page recommends the cached variant, but it writes results to plaintext JSON files, and a person's domain portfolio and their unregistered name ideas do not belong there.

**Storage splits by sensitivity** (`src/storage.ts`). Raycast's LocalStorage is an encrypted database and the Cache API is plaintext files on disk. Personal data (the domain snapshot, the user's IP) goes to LocalStorage; public data (TLD pricing) goes to the Cache.

**Registration hands off to the browser** (`src/register-domain.tsx`). The extension verifies a name, then opens Namecheap checkout. A Namecheap API key is full-account and can spend the user's balance, so every purchase stays in the browser where the user confirms it.

## Setup copy

`help.md` ships as `HELP.md`, and Raycast renders it beside the preferences form, which is the first screen a new user sees. Setup instructions belong there; `README.md` covers the same ground for people browsing the repo.

## Namecheap API

Read [`docs/namecheap-api.md`](docs/namecheap-api.md) before changing anything under `src/namecheap/`. It covers how the live API actually behaves: which address it authorises, the order it validates things in, error codes whose published meanings disagree with the wire, and the sandbox hosts.
