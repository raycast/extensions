# Changelog

Human-readable, notable changes. Follows a Keep-a-Changelog-ish style.
Dates are ISO (YYYY-MM-DD).

> This is the detailed **internal** dev changelog. The **store-facing** changelog
> the Raycast Store reads is the root [`CHANGELOG.md`](../CHANGELOG.md), which
> uses Raycast's `## [Title] - {PR_MERGE_DATE}` format. Keep both in sync when
> shipping a store update. See [`docs/SUBMISSION.md`](SUBMISSION.md).

## v0.3.1 — 2026-07-15

### Fixed

- **Picking a folder now actually adds it.** The folder picker used a form that
  only saved on an explicit submit action — picking a folder and backing out
  discarded it, so "nothing happened." Folders are now added the moment they're
  picked (via `FilePicker` `onChange`), with a confirmation toast, and the view
  returns automatically. The typed-path field still commits on ⏎.
- **Adding a folder mid-scan no longer misses it.** If a scan was already running
  when roots changed, the store now queues a follow-up scan so the new folder is
  always indexed.

## v0.3.0 — 2026-07-15

### Added

- **Pick search folders inside the extension.** A native folder picker
  (`Form.FilePicker`) lets you add folders without opening preferences. When no
  folders are configured, the command's "Choose folders to search" screen has an
  **Add Folder…** action; from the results view, **Manage Search Folders**
  (`⌘⇧F`) opens a manager to add or remove folders. In-app folders are stored in
  Raycast `LocalStorage`. See DECISIONS ADR-011.

### Changed

- Search now scans the **union of preference folders and in-app folders**, and
  the background refresh honors both. Preference folders remain available for
  bulk/advanced editing and appear as read-only entries in the manager.

## v0.2.0 — 2026-07-15

### Changed

- **Search roots are now opt-in — RepoScout no longer scans your whole Mac.**
  The `searchRoots` preference has no default. Point RepoScout at the folders you
  want (e.g. `~/code, ~/work`) and it searches only those. See DECISIONS ADR-010.

### Added

- **"Choose folders to search" prompt.** When no search roots are configured, the
  command shows guidance with a one-click **Open Preferences** action instead of
  scanning anything. The background refresh also no-ops (and never overwrites an
  existing cache) when no roots are set.

## v0.1.1 — 2026-07-15

### Fixed

- **Open in VS Code / Cursor now works reliably.** The open actions previously
  passed a hardcoded application display name to `open()`, which failed silently
  when the editor was installed as VSCodium, Insiders, an OSS build, or under a
  non-standard name. Editors are now resolved against the actually-installed
  applications by bundle identifier (with a name fallback), so the real app —
  and its real path — is launched. See DECISIONS ADR-009.
- **No more silent failures.** Every open action (editors, Terminal) now surfaces
  a clear error toast when an app is missing or the launch fails, instead of
  appearing to do nothing.

## v0.1.0 — 2026-07-15

Initial MVP: instantly find and open every Git repository on your Mac.

### Added

- **Repository discovery**: symlink-safe, permission-tolerant, iterative
  directory walker that detects normal, worktree, and bare repositories and
  skips ignored directories.
- **Git enrichment**: current branch, dirty/clean status, origin remote (with
  https browse-URL normalization), and last-commit time via a non-interactive,
  no-shell git wrapper.
- **Cached repository index** persisted as atomic JSON with schema versioning.
- **Incremental indexing**: fingerprint-based reconciliation re-enriches only
  repositories whose Git state changed.
- **Background refresh** command running on a 1-hour interval and on demand.
- **Fast fuzzy search** over the cached index with tiered scoring
  (exact > prefix > acronym > fuzzy).
- **Modular ranking** across seven signals: match, pinned, favorite, recency,
  frequency, git-activity, short-path.
- **Actions**: Open in VS Code, Open in Cursor, Open in Finder, Open in Terminal,
  Copy Repository Path, Copy Git Remote, Open Remote on Web, Copy Current Branch.
- **Favorites, pins, and open-history** (recency + frequency) persisted
  separately from the index and reflected in ranking.
- **Preferences**: search roots, max scan depth, ignored directories, follow
  symlinks, include bare repos, primary editor, terminal app.
- **List UI** showing branch, dirty/clean status, favorite/pin badges, and
  last-commit age.
- **Icon** (reproducible generator in `scripts/generate-icon.mjs`).
- **Test suite**: 141 tests (~97% core coverage), including real-git and
  temp-filesystem integration tests.
- **Documentation suite**: ARCHITECTURE, DECISIONS, PROGRESS, BACKLOG, TESTING,
  CURRENT_TASK, SESSION_SUMMARY, and README.

### Notes

- Lint uses a self-contained ESLint 9 flat config (see DECISIONS ADR-006);
  reconciling with `ray lint` is tracked for Store submission.
