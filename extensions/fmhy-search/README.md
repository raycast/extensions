# FMHY Search for Raycast

Search the FMHY single-page index from Raycast. The extension fetches the public FMHY markdown index, parses resource links locally, caches the parsed index in Raycast storage, and lets you search by title, URL, hostname, category, category URL, description, status flags, and related-link text.

## Commands

- `Search FMHY`: Opens a searchable list of cached FMHY resources grouped by category. Use `Refresh Index` in the action menu to update the local cache.

## Features

- Local cached search of `https://api.fmhy.net/single-page` with a 24-hour freshness window.
- Grouped category sections with category note counts and an index status row.
- Resource actions for opening the resource, opening the normalized FMHY category, showing category notes, copying values, and refreshing the index.
- Category notes open in a pushed detail view with metadata and a normal Open Category action.
- X/Twitter, Discord, GitHub, GitLab, Telegram, and Reddit related links stay directly available as quick actions with brand icons.
- Other related links open in a dedicated related-links list. Results show a link icon and count when those non-social related links exist.
- Reddit wiki redirects and generated category URLs are normalized to current `fmhy.net` routes, for example `/adblocking/#adblock-filters` becomes `/privacy#adblock-filters`.
- Manual pagination loads 100 results at a time, briefly moves selection to the first newly loaded result after `Load More Results`, then returns to native Raycast list navigation.

## Requirements

- Raycast for Windows beta or Raycast for macOS
- Node.js 22.14 or newer
- npm 7 or newer
- Git and GitHub CLI for the WSL-to-Windows sync workflow

## Development

Install dependencies from the extension root:

```bash
npm install
```

Run the extension in Raycast development mode:

```bash
npm run dev
```

On Windows, the dev script forces the Raycast CLI to use the registered `raycast://` protocol instead of `raycast-x://`.

Build the production bundle:

```bash
npm run build
```

Run the full local check:

```bash
npm run check
```

`npm run check` uses a local Raycast API stub with Raycast relaxed linting so source validation and builds still work in offline, DNS-restricted, or proxied development environments. Before cutting a release, run the full Raycast manifest and metadata validation from a network that can reach `www.raycast.com`:

```bash
npm run check:release
```

Run individual checks when narrowing failures:

```bash
npm run lint
npm run lint:release
npm run build
```

## WSL and Windows Workflow

Use two checkouts and GitHub as the sync point:

1. Develop in WSL.
2. Commit and push from WSL.
3. Pull the same branch from a Windows checkout.
4. Run `npm install` and `npm run dev` from Windows PowerShell so Raycast for Windows can import and reload the extension.

Do not share `node_modules` between WSL and Windows. Each side should install dependencies in its own checkout.

Example Windows setup after the GitHub repository exists:

```powershell
gh repo clone <your-username>/raycast-fmhy-search
cd raycast-fmhy-search
npm install
npm run dev
```

Example daily sync:

```bash
# WSL
git pull
git status
git add README.md src package.json package-lock.json
git commit -m "Update FMHY search extension"
git push
```

```powershell
# Windows
git pull
npm install
npm run dev
```

More detail is in [docs/windows-development-workflow.md](docs/windows-development-workflow.md).

## Project Layout

- `src/search-fmhy.tsx`: Main view command for browsing and opening FMHY resources.
- `src/lib/cache.ts`: Versioned Raycast cache storage and legacy cache migration.
- `src/lib/fmhy-api.ts`: FMHY single-page fetch and index construction.
- `src/lib/fmhy-url.ts`: FMHY route aliases, Reddit wiki redirects, and generated category URL normalization.
- `src/lib/parser.ts`: Markdown parsing, category metadata, related-link extraction, and result normalization.
- `src/lib/search.ts`: Token-based filtering over cached result fields.
- `src/lib/format.ts` and `src/lib/errors.ts`: Display formatting and user-facing error helpers.
- `src/lib/types.ts`: Shared index, category, result, and related-link types.
- `assets`: Raycast extension icon assets.
- `docs`: Development and maintenance notes.
- `.github/workflows`: GitHub Actions validation.

## Notes

The extension supports both `macOS` and `Windows` in `package.json`. Raycast for Windows extension tooling is still evolving, so run `npm run dev` from a native Windows shell when testing on Windows. The Windows dev wrapper only rewrites Raycast dev notification URLs from `raycast-x://` to the registered `raycast://` protocol; it does not change Raycast's local dev storage flavor.
