# CLAUDE.md

## Project Summary

- Raycast extension: `bopomofo-search`
- Purpose: search and convert Pinyin to Bopomofo (注音符號).
- Main commands:
  - `Bopomofo Search` (`src/bopomofo-search.tsx`)
  - `Pinyin to Bopomofo` (`src/pinyin-to-bopomofo.tsx`)
- Data files:
  - `assets/bopomofo-dataset.json`
  - `assets/pinyin-translation.json`

## Tooling and Runtime

- Package manager for this repo is **npm**.
- Lockfile of record is `package-lock.json` (do not switch back to Bun workflow).
- Scripts:
  - `npm run dev` -> `ray develop`
  - `npm run build` -> `ray build`
  - `npm run lint` -> `ray lint`

## Important Environment Constraints

- Raycast tooling currently expects newer Node runtimes.
- If lint/build errors mention `addAbortListener` or engine mismatch, use Node `>=22.14`.
- In sandboxed environments, `ray build` may fail writing to `~/.config/raycast`; rerun with required permissions.
- `ray lint` may require network access to validate schema/author with Raycast endpoints.

## Manifest and Metadata Rules

- Keep `package.json` aligned with Raycast Store expectations:
  - `author`: Raycast username (`dogeon`)
  - `license`: `MIT`
  - `categories`: at least one (`Productivity` is currently set)
  - `icon`: `extension-icon.png` (resolved from `assets/`)
- Avoid user-facing "WIP" wording in command descriptions.
- Keep command titles in Title Case.

## Changelog Convention

- Use Raycast-compatible format:
  - `## [Change Title] - {PR_MERGE_DATE}` or `YYYY-MM-DD`
- Keep entries concise and user-facing.
- Current changelog file: `CHANGELOG.md`.

## Docs and Content

- README uses npm-based commands and should stay in sync with scripts.
- If publish requirements change, update:
  - `README.md`
  - `CHANGELOG.md`
  - `package.json`

## Agent Workflow Notes

- Before release-focused changes, check `publish-guide.md`.
- Prefer minimal, targeted edits; avoid broad refactors unless requested.
- Validate by running:
  1. `npm run lint`
  2. `npm run build`
