# AGENTS.md

Instructions for AI coding agents working on the Soaring Symbols Raycast extension.

## Project

A Raycast extension for browsing the [Soaring Symbols](https://github.com/soaring-symbols/soaring-symbols) airline logos, icons and tails, and the marks of airline alliances.

- `src/browse-airlines.tsx`, `src/browse-alliances.tsx` and `src/airline-info.tsx` — the three commands declared in `package.json`.
- `src/components/airline-grid.tsx` — the airline grid of Browse Airlines, also opened from Browse Alliances on one alliance's members.
- `src/components/assets.tsx` — the grid of an airline's or an alliance's SVG files, with copy and download actions.
- `src/components/alliances.tsx` — `useAllianceFilter` (both lists and the airlines the filter lets through, for the commands with the filter; a pushed view can take its parent's lists instead of fetching) and `allianceIcon`.
- `src/components/searchbar.tsx` — the alliance filter, listing every alliance in the data (disbanded ones match the airlines that flew in them, through `alliance_history`).
- `src/utils/airlines.ts` — data and SVG URLs (`DATA_LINE`), and the helpers that decide which asset tiles to show, for airlines and alliances. Keep it free of runtime imports of other files: the tests run it through Node's type stripping, which doesn't resolve extensionless paths.
- `src/utils/fetch.ts` — loads the airline and alliance lists from the same release, falling back to the bundled ones.
- `test/` — unit tests for the pure helpers in `src/utils/airlines.ts`, run by Node's test runner.
- `assets/extension-icon.png` — the store icon, a 512×512 PNG. It is a copy of `exports/raycast/icon-signal.png` in [soaring-symbols/brand](https://github.com/soaring-symbols/brand), which renders it from the brand mark; change it there first.
- `metadata/` — store screenshots (2000×1250), taken in Raycast.

### Where the data comes from

At runtime the extension loads `airlines.json` and the SVGs from the published `soaring-symbols` npm package through jsDelivr, pinned to one release line: `https://cdn.jsdelivr.net/npm/soaring-symbols@<DATA_LINE>/dist/…`, with `DATA_LINE` (e.g. `"0.4"`) in `src/utils/airlines.ts`. The library uses plain 0.x versions, with patch releases for compatible changes and minor releases for breaking ones, so:

- Every patch release in the line (new airlines, fixed SVGs) reaches installed copies within about 12 hours (jsDelivr's cache), with no store update.
- `fetchAirlines` first asks jsDelivr which release the line points at (`RESOLVE_URL`, e.g. `0.4.0`), then loads `airlines.json` and every SVG from that exact release (`setDataVersion`, remembered in Raycast's `Cache` for the next launch). A line URL keeps its address when a release replaces the file behind it, and Raycast's own image cache, which no cache clearing reaches, would keep showing the old logo for up to 7 days (jsDelivr's `max-age`). When the release can't be resolved, everything loads from the line as before.
- A breaking minor release (e.g. `0.5.0`) never reaches the extension until it is updated, so a library change cannot break it.
- If the list can't be loaded or isn't a usable airline list (`isAirlineList`: a non-empty array whose entries have a `slug` and `assets`), `fetchAirlines` shows a toast and falls back to `listAirlines()` from the bundled `soaring-symbols` dependency. `useCachedPromise` also shows the last loaded list while a new one loads.
- Types come from the package (`import type { Airline } from "soaring-symbols"`).

When the library releases a new minor line, update the extension in one change:

1. Set `DATA_LINE` to the new line.
2. Move the `soaring-symbols` dependency to it (`npm install soaring-symbols@^0.5.0`).
3. Adapt the code to the breaking change.
4. Add a changelog entry and publish.

Prepare this before the library release when possible, so installed copies don't sit on the old line for long.

## Commands

| Command            | What it does                                                                |
| :----------------- | :-------------------------------------------------------------------------- |
| `npm run dev`      | Run the extension in Raycast in development mode.                           |
| `npm run build`    | Build it (`ray build`), including the TypeScript check.                     |
| `npm run lint`     | Validate the manifest and icons, then run ESLint and Prettier.              |
| `npm run fix-lint` | Same, fixing what can be fixed.                                             |
| `npm test`         | Run the `*.test.ts` files in `test/` with Node's test runner (Node 22.18+). |
| `npm run publish`  | Open a pull request to the Raycast Store. Only the maintainer runs it.      |

Dependencies are tracked in `package-lock.json` only: install them with npm (`bun.lock` is git-ignored).

## Publishing

Only the maintainer publishes, and only the maintainer runs `npm run publish` or `npx ray pull-contributions`: never run either unasked. Both follow the maintainer's shared rules for every Raycast extension, with no exceptions here: the store pull request never carries the agent instructions, this repository's `.gitignore` or unchanged originals of images the store already has in optimized form, and the merge `ray pull-contributions` makes is never kept on `main` (bring over only the real changes as a normal commit, so the history stays linear).

## Naming

Give names that people see on the store an aviation, airline or travel flavor that fits what the change does. This covers changelog entry titles, new command titles, and section or action labels when a plain label isn't required for clarity. Examples:

- `Departure`: the first release.
- `New Livery`: a new icon or visual refresh.
- `Course Correction`: bug fixes.
- `Extra Legroom`: layout or usability improvements.
- `New Routes`: new commands or features.
- `Cleared for Takeoff`: a feature leaving beta.

Keep the name short (one to three words), in Title Case, and don't reuse one already in `CHANGELOG.md`. Clarity comes first: an action like "Copy SVG" stays literal, and code identifiers, file names and commit messages follow normal conventions.

## Changelog

Every user-facing change adds an entry at the top of `CHANGELOG.md`, in the store's format. A new version always gets the literal `{PR_MERGE_DATE}` placeholder as its date, never a real one: the Raycast Store fills it in when it merges the store pull request. Keep adding to that entry until it is published, and leave dates on published entries as they are.

```markdown
## [New Livery] - {PR_MERGE_DATE}

- What changed, written for users.
```

## Conventions

- Prettier with `printWidth: 120` and double quotes, ESLint from `@raycast/eslint-config`. Run `npm run lint` before committing.
- Commits follow Conventional Commits, e.g. `feat: add tail filter`, `fix: skip missing mono files`.
