# Contributing to the Userplane Raycast Extension

## Local development

From the monorepo root:

```sh
bun install
make raycast:dev
```

`make raycast:dev` runs `ray develop`, opening the extension in your local Raycast with hot reload.

Before committing:

```sh
make raycast:typecheck
make raycast:lint
make raycast:build
```

Inside `apps/raycast/` you can also run the underlying scripts directly:

```sh
cd apps/raycast
bun run dev
bun run typecheck
bun run lint
bun run build
```

## Architecture

The extension is intentionally standalone — no `@userplane/*` workspace dependencies — so `ray publish` produces a valid Store submission without bundling any private packages.

- `src/api/` — hand-written API client and type mirrors of `packages/contract/src/schemas/`. Resync by hand when the contract changes.
- `src/hooks/` — one `useCachedPromise` wrapper per resource (workspaces, domains, projects, members, links, recordings).
- `src/components/` — shared pieces (`CommonActions`, `LinkSuccess`).
- `src/utils/` — `dash-urls`, `format`, `normalize-url`.
- `src/*.tsx` — one file per command (`create-link`, `list-links`, `list-recordings`, `menu-bar`) plus filter form components.

## Package manager: bun for dev, npm lockfile for publish

The monorepo uses `bun`. Dev continues to use `bun install` / `bun run dev`. However, the Raycast Store requires a `package-lock.json` for reviewers, so we commit one alongside `bun.lock`. It gets regenerated (and kept in sync with `package.json`) via:

```sh
make raycast:prepublish
```

`make raycast:publish` depends on `raycast:prepublish`, so running the full release flow always refreshes the lockfile first. `npm install --package-lock-only` only writes the lockfile — it never touches `node_modules` — so it cannot race with `bun install` at the monorepo root.

## Releasing to the Raycast Store

Prerequisites:

1. `package.json` → `"private": false`.
2. `CHANGELOG.md` has an entry for this release.
3. `metadata/` contains at least 3 screenshots at 2000×1250 PNG. See `dumps/raycast/screenshots.md` for capture instructions.
4. `package-lock.json` is committed and current (`make raycast:prepublish`).

Then, from the monorepo root:

```sh
make raycast:lint
make raycast:build
make raycast:publish
```

`make raycast:publish` regenerates `package-lock.json`, then runs `ray publish`, which opens a PR against `raycast/extensions`. The Raycast team reviews the PR; respond to feedback in that thread.

## Contract drift

Types in `src/api/types.ts` mirror `packages/contract/src/schemas/`. When the contract changes in the monorepo, resync these by hand, bump the extension version in `package.json`, add a `CHANGELOG.md` entry, and publish a new release.

## Updating keywords/categories

Edit `package.json`, then run `make raycast:build` to regenerate `raycast-env.d.ts`.
