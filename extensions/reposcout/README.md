# RepoScout

Instantly find and open every Git repository on your Mac. Press your Raycast
hotkey, type a few characters, and jump straight into the repo — no more
remembering where anything lives.

RepoScout indexes your repositories once and searches an in-memory cache, so
results are instantaneous even with thousands of repos.

## Features

- 🎯 **You choose where it looks** — pick folders with a built-in folder picker (no preferences trip needed); searches only those, not your whole Mac
- 🔍 **Fast fuzzy search** across your Git repos (exact > prefix > acronym > fuzzy)
- ⚡ **Instant results** from a cached index — search never rescans your disk
- 🔁 **Incremental background indexing** — only changed repos are re-read
- 🌿 **At-a-glance metadata** — current branch, dirty/clean status, last-commit age
- 📂 **Open anywhere** — VS Code, Cursor, Finder, Terminal
- 📋 **Copy** repository path or Git remote; **open** the remote on the web
- ⭐ **Favorites, pins, and recents** that shape ranking over time
- 🧭 Detects **normal, worktree, and bare** repositories

## Install & develop

Requires Node ≥ 18 and the [Raycast](https://raycast.com) app.

```bash
npm install
npm run dev      # ray develop — live-reload inside Raycast
npm run build    # ray build
```

Quality gates:

```bash
npm run check          # typecheck + lint + tests
npm run test:coverage  # coverage report
```

## Commands

- **Search Repositories** — the main fuzzy-search view.
- **Refresh Repository Index** — background command; also runs every hour.

## Preferences

| Preference              | Default                  | Description                                                                                                                                                                                                                         |
| ----------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search Roots            | _none — you choose_      | Optional: comma/newline-separated folders (e.g. `~/code, ~/work`). You can also add folders **inside the extension** with the built-in picker; RepoScout searches the union of both. Empty everywhere ⇒ it prompts you to add some. |
| Maximum Scan Depth      | `8`                      | Levels to descend below each root (clamped 1–32).                                                                                                                                                                                   |
| Ignored Directory Names | `node_modules,Library,…` | Directory names to skip.                                                                                                                                                                                                            |
| Follow Symlinks         | off                      | Descend into symlinked directories (cycle-safe).                                                                                                                                                                                    |
| Bare Repositories       | on                       | Detect bare repos.                                                                                                                                                                                                                  |
| Primary Editor          | VS Code                  | Editor for the default Open action (or Cursor).                                                                                                                                                                                     |
| Terminal                | Terminal                 | Terminal app for Open in Terminal.                                                                                                                                                                                                  |

## How it works

Discovery → enrichment → indexing → search are strictly separated. Search only
ever reads the cached index. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for the full design, and [`docs/DECISIONS.md`](docs/DECISIONS.md) for the
rationale behind key choices.

## Project layout

```
src/
  types/         domain vocabulary (dependency-free)
  utils/         Result, logger, path, async pool, display
  filesystem/    discovery, git-marker detection, fingerprints
  git/           exec wrapper, metadata reader, remote URLs
  cache/         atomic JSON, index + user-data stores
  indexer/       incremental reconcile + orchestrator
  ranking/       modular weighted signals + decay math
  search/        fuzzy matcher + query-time search
  preferences/   parse preferences + manage in-app search folders
  actions/       editor labels + installed-app resolution
  hooks/         useRepositoryStore (UI ⇄ core seam)
  components/    list item, action panel, folder manager + picker
  commands/      search view + background refresh
docs/            architecture, decisions, progress, backlog, testing, …
tests/           unit + integration (Vitest)
```

## Contributing

Documentation is part of the implementation. Before considering a change done,
run `npm run check` and update the relevant files in `docs/` — especially
`PROGRESS.md`, `CURRENT_TASK.md`, and `SESSION_SUMMARY.md`. See
[`docs/TESTING.md`](docs/TESTING.md) for the testing policy.

## License

MIT — see [LICENSE](LICENSE).
