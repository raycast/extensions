# Contributing to RayKagi

Thanks for your interest in improving RayKagi! This is a small, unofficial
[Raycast](https://raycast.com) extension for [Kagi](https://kagi.com).
Issues and pull requests are welcome.

## Prerequisites

- [Raycast](https://raycast.com) installed (macOS or Windows)
- Node.js 18+
- A Kagi account. Only the **Search** command needs a Kagi API token
  ([kagi.com/api/keys](https://kagi.com/api/keys)); everything else just opens
  Kagi web pages.

## Getting started

```sh
npm install
npm run dev      # ray develop — loads the extension into Raycast with hot reload
```

Keep `npm run dev` running while you work; edits rebuild automatically and the
commands appear under your local Raycast.

## Before opening a pull request

Please make sure all of these pass:

```sh
npx tsc --noEmit            # type-check
node scripts/check-urls.mjs # URL-builder self-check (no framework)
npm run lint                # ray lint (ESLint + Prettier + manifest/icon checks)
npm run build               # ray build
```

- Format with Prettier (`npx prettier --write "src/**/*.{ts,tsx}"`).
- Match the existing style and keep changes minimal and focused.
- Update `README.md` / `CHANGELOG.md` when behavior or commands change.

## Project layout

| Path | What |
| --- | --- |
| `src/*.tsx`, `src/*.ts` | One entry point per command in `package.json` |
| `src/kagi.ts` | Kagi API client (v1 Search) + bangs catalog cache |
| `src/urls.ts` | Pure URL builders / parsers (no Raycast import — unit-tested) |
| `scripts/check-urls.mjs` | Dependency-free assertions for `src/urls.ts` |
| `assets/` | Command icons (PNG) |

The URL builders live in `src/urls.ts` precisely so they can be tested without
the Raycast runtime — if you change one, add/adjust an assertion in
`scripts/check-urls.mjs`.

## Reporting issues

Open a [GitHub issue](https://github.com/Shabablinchikow/RayKagi/issues) with
steps to reproduce, your Raycast version, and whether an API token is set.

## A note on assets

Please don't add Kagi (or other third-party) brand assets you don't have the
right to redistribute. The bundled product icons belong to Kagi Inc.; only
`bang.*` is original to this project.
