# DDEV for Raycast

A [Raycast](https://raycast.com) extension for managing your local [DDEV](https://ddev.com) projects without leaving your keyboard. List every DDEV project on your machine and start, stop, restart, snapshot, describe, rename, and launch them — all from Raycast.

The extension is framework-agnostic at its core (it works with any DDEV project type), with a few extra conveniences for Drupal projects.

> **Platform:** macOS only. Requires the [`ddev`](https://ddev.com) CLI installed and on your `PATH` (Homebrew at `/opt/homebrew/bin` or `/usr/local/bin` is detected automatically).

## Commands

The extension exposes a single Raycast command:

| Command | Mode | Description |
| --- | --- | --- |
| **Show Projects** | View | Lists all DDEV projects found via `ddev list`, with a per-project action panel for every operation below. |

The project list can be filtered with the status dropdown in the search bar:

- **All** — every project DDEV knows about.
- **Active** — only projects currently `running`.

Active projects are marked with a green check; stopped projects with a red disabled icon. Type to search projects by name.

## Actions

Each project in the list has an action panel (`⏎` / `⌘K`). Mutating actions show a progress toast and surface any `ddev` error message on failure. Destructive actions ask for confirmation first.

### General

| Action | Description |
| --- | --- |
| Launch Website | Open the project's primary URL in the browser (`ddev launch`). |
| Show Project Information | Open a detail view (`ddev describe`) with project, database, URLs, services, and Mailpit info. |
| Open in Finder | Reveal the project root in Finder. |
| Copy Project Path | Copy the project's `approot` to the clipboard. |

### Start / Stop / Restart

| Action | Description |
| --- | --- |
| Start Project | `ddev start` the project. |
| Stop Project | `ddev stop` the project. |
| Stop Project (--unlist) | `ddev stop --unlist` — stop and remove from the project list. |
| Restart Project | `ddev restart` the project. |

### Backup / Restore

| Action | Description |
| --- | --- |
| Show Snapshots | Open a list of database snapshots for the project (see below). |
| Take Quick Snapshot | Take a timestamped database snapshot (active projects only). |
| Export Database | Export the database to `~/Downloads/<project>.sql` (active projects only, with confirmation). |

Inside **Show Snapshots** you can:

- **Take New Snapshot** (`⌘N`) — opens a form with a suggested `<project>-<timestamp>` name.
- **Restore Snapshot** — replaces the current database with the snapshot (confirmation required).
- **Delete Snapshot** (`⌃X`) — permanently remove a snapshot (confirmation required).
- **Copy Snapshot Name** — copy the snapshot name to the clipboard.

### Other

| Action | Description |
| --- | --- |
| Rename Project | Rename the project (active projects only). Runs a safe multi-step macro: snapshot → stop & unlist → reconfigure name → restart → restore database → clean up the temporary snapshot. **Don't close the window mid-rename.** |

### Drupal-only

For projects whose type starts with `drupal`, an extra section appears:

| Action | Description |
| --- | --- |
| Launch Website (and Login) | Generate a one-time login link via `ddev drush uli` and open it in the browser. |

## How it works

- The UI lives in `src/show-projects.tsx`; all CLI interaction is isolated behind `src/lib/`.
  - `src/lib/ddev.ts` — every `ddev` shell-out (start/stop/snapshot/describe/rename/…), JSON parsers, and the toast wrappers.
  - `src/lib/drush.ts` — Drupal/`drush` helpers (framework-specific).
  - `src/lib/types.ts` — TypeScript shapes for `ddev … --json-output` payloads.
  - `src/lib/describe-markdown.ts` — renders the "Show Project Information" detail view.
- The extension shells out to the `ddev` CLI directly (no daemon) and relies on `--json-output` for reading state.

## Development

```bash
npm run dev        # ray develop — live-reload into Raycast
npm run build      # ray build — production build
npm run lint       # ray lint
npm run fix-lint   # ray lint --fix
npm run publish    # publish to the Raycast Store
```

There is no test runner configured.

## Requirements

- macOS
- [Raycast](https://raycast.com)
- The [`ddev`](https://ddev.com/get-started/) CLI (and Docker / OrbStack, as DDEV requires)

## License

MIT — see [LICENSE](./LICENSE).
