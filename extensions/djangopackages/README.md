# Django Packages Raycast Extension

Explore [djangopackages.org](https://djangopackages.org/) without leaving Raycast. Search packages, inspect metadata, and jump to docs, repos, or PyPI with a keystroke.

## Features
- 🔍 **Fast package search** – Debounced queries against the Django Packages API return relevant packages quickly.
- 🗂️ **Smart category filters** – Cached dropdown of official categories helps narrow results instantly.
- 📦 **Action-rich results** – Open details, documentation, PyPI, or Repository links and copy URLs straight from the list.
- 📋 **Detail view insights** – See usage stats, release cadence, grids, and quick links inside a dedicated detail view.
- ⚡ **Offline-friendly caching** – Search, categories, and package details are cached with sensible TTLs to mask flaky networks.

## Commands
| Command | Description |
| --- | --- |
| `Search Django Packages` | Search packages, filter by category, read details, and open related resources. |

## Installation
```bash
npm install
ray dev
```

## Usage
1. Launch `Search Django Packages` from Raycast.
2. Narrow the list with the category dropdown.
3. Select a package to view details or trigger quick actions (Docs, PyPI, Repository, Copy URL, etc.).

No API tokens are required.

## Development & Publishing Checklist
- `npm run build` to produce the optimized bundle Raycast review will use.
- Capture Raycast-native screenshots (⌘⇧⌥M) for the Store metadata when ready.
- Keep the `CHANGELOG.md` updated so users can track releases.

## Permissions & Security
- **Network** – Required to call the public djangopackages.org API. No credentials are stored or transmitted.

## Troubleshooting
- If searches fail, the command falls back to cached responses and shows a toast. Use the Refresh action in the detail view to bypass cache once connectivity returns.
- Delete Raycast's extension cache if categories appear stale.

## Implementation Notes
- All network access flows through `src/data.ts` for easier caching and error handling.
- Cache TTLs: 15 minutes (search), 6 hours (package detail), 12 hours (categories).
- The UI is built entirely with Raycast primitives to ensure native light/dark support.
