# Quick References

Raycast extension for searching and browsing [Fechin/reference](https://github.com/Fechin/reference) cheat sheets. Features offline support, fast fuzzy search, favorites, and markdown detail view.

## Features

- **Live data fetching**: Downloads cheat sheets from GitHub on first launch
- **Fast search**: Search across titles, tags, headings, and content snippets
- **Favorites section**: Favorite items appear at the top of the list
- **Recents tracking**: Quick access to recently viewed references
- **Detail view**: Full markdown rendering with metadata
- **Copy actions**: Copy snippet, title, or link with one action
- **Manual update**: Refresh data anytime to get the latest cheat sheets

## Commands

- **Search References**: Browse and search cheat sheets with favorites at the top
- **Update References**: Download the latest reference data from GitHub

## Keyboard Shortcuts

- `⌘F`: Toggle favorite (in list and detail views)
- Standard Raycast copy/open actions available in the action panel

## Permissions

- `network`: Used to download reference data from GitHub
- `filesystem`: Store downloaded data in Raycast support directory for offline use

## Development

```bash
npm install
npm run dev
npm run lint
npm run build
```

## License

MIT
