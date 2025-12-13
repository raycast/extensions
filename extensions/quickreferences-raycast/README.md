# QuickReferences (Raycast Extension)

Raycast extension for the [Fechin/reference](https://github.com/Fechin/reference) cheat sheets. Ships with an offline dataset, fast fuzzy search, favorites/recents, and markdown detail with copy actions.

## Features
- Offline-first: bundled index + markdown content; no network in normal use.
- Fast search across titles, tags, headings, and top snippets.
- Detail view with metadata; copy snippet/title/link in one action.
- Favorites and recents persist between launches.
- Manual updater to pull the latest cheat sheets from GitHub.

## Commands
- **QuickReferences** (`src/search.tsx`): Search and open cheat sheets; copy snippet/title/link; toggle favorites; open GitHub.
- **Update References** (`src/update.tsx`): Download latest Fechin/reference ZIP, regenerate dataset, and cache it locally (falls back to bundled data on failure).

## Permissions (store reviewers)
- `network`: only used by **Update References** to fetch the Fechin/reference ZIP from GitHub.
- `filesystem`: store refreshed datasets in the Raycast support path for offline use.

## Keyboard Shortcuts
- `⌘F`: Toggle favorite (list and detail actions).
- Standard Raycast copy/open actions available in the action panel.

## Development / Maintenance
- Install deps: `npm install`
- Rebuild bundled data: `npm run generate:data` (uses `../reference/source/_posts`)
- Lint: `npm run lint`
- Type-check: `npx tsc --noEmit`
- Build: `npx ray build -e dist`
- Dev (Raycast app + CLI required): `npx ray develop`

## Data Notes
- Bundled dataset: `data/meta.json`, `data/index.json`, `data/content.json`.
- Updated dataset is written to the Raycast support directory and preferred when newer than the bundle.

## License
MIT
