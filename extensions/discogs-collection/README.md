# Discogs for Raycast

Browse and search your Discogs record collection directly from Raycast — no browser required.

Your entire collection is fetched and cached locally, so search is instant. Filter by format, sort by recently added, and open any release to see its full tracklist, label, and pressing details.

![Search My Collection](metadata/search-collection.png)

---

## Features

- **Instant fuzzy search** across title, artist, label, genre, and style
- **Filter by format** — Vinyl, CD, Cassette, Digital, and more
- **Sort** by recently added (default), title, artist, or year
- **Release detail view** with full tracklist, cover art, label, country, and notes
- **Open in Discogs** or search on YouTube directly from any result
- **Local cache** with background revalidation — fast on repeat opens
- **Simple auth** via a personal access token — no OAuth flow required

---

## Setup

1. Generate a personal access token at [discogs.com/settings/developers](https://www.discogs.com/settings/developers)
2. Open Raycast → search **Search My Collection** → open Preferences (`⌘,`)
3. Enter your Discogs username and token

---

## Development

### Prerequisites

- [Raycast](https://www.raycast.com/) (macOS)
- Node.js 18+

### Getting started

```bash
git clone https://github.com/formgeist/raycast-discogs.git
cd raycast-discogs
npm install
npm run dev
```

`npm run dev` imports the extension into Raycast in development mode with hot reloading. Any saved change is reflected immediately.

### Project structure

```
src/
├── search-collection.tsx   # Main command — list view with search, filter, sort
├── release-detail.tsx      # Detail view pushed from list (tracklist, metadata)
├── use-collection.ts       # Data fetching hook — pagination, caching, revalidation
└── types.ts                # TypeScript interfaces for Discogs API responses
assets/
└── extension-icon.png      # 512×512 extension icon
metadata/
└── description.md          # Raycast Store description
```

### Useful commands

| Command | Description |
|---|---|
| `npm run dev` | Start with hot reloading in Raycast |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint + Prettier checks |
| `npm run fix-lint` | Auto-fix lint and formatting issues |

---

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repo and create a branch from `main`
2. **Install** dependencies with `npm install`
3. **Run** `npm run dev` to test your changes live in Raycast
4. **Lint** before committing — `npm run lint` (or `npm run fix-lint` to auto-fix)
5. **Open a pull request** with a clear description of what changed and why

### Ideas for contribution

- Wantlist command (`GET /users/{username}/wants`)
- Artist detail view
- Copy-to-clipboard actions (label, catalogue number, tracklist)
- Keyboard shortcut to add a rating

### Reporting issues

Please [open an issue](https://github.com/formgeist/raycast-discogs/issues) with steps to reproduce, your macOS version, and the Raycast version.

---

## License

MIT
