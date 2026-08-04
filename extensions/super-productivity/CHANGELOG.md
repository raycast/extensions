# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Initial Release] - 2026-08-04

### Added

- **Resume Tracking** — tasks with `timeSpent > 0` now surface a **Resume Tracking (X.Xh spent)** action with a rewind icon (↻) instead of **Start Tracking** (▶). Visible in `View Tasks`, `Today's Tasks`, `Scheduled Tasks`, `Browse Projects` (drill-down), and `Current Task`. Both paths call the same `POST /tasks/{id}/start` endpoint and fire the same SP focus wiring (`autoStartFocusOnPlay`).
- **Keyboard shortcuts** for every common action:
  - `Enter` — Start / Resume Tracking on live task views; Restore on Archived; View Tasks on Browse Projects.
  - `Cmd+Shift+C` — Mark Complete (live task views).
  - `Cmd+E` — Archive (live task views).
  - `Cmd+Backspace` — Delete / Delete Permanently (task views and Archived); Delete Tag (Manage Tags).
  - `Cmd+R` — Refresh (all list views).
  - `Cmd+[` — Back to Projects (Browse Projects drill-down).
  - `Cmd+N` — Create Tag (Manage Tags).
- **Unit tests** for `src/api.ts` (24) and `src/utils.ts` (12) with Vitest — covering success paths, error paths, HTTP/API/connection failures, toast assertions, and edge cases. The CI workflow now runs them on every push/PR.
- **Auto-focus on tracking** — flipping Super Productivity's `autoStartFocusOnPlay` toggle wires `/tasks/{id}/start` events from this extension to focus-session starts. See [`docs/FOCUS-SESSIONS.md`](docs/FOCUS-SESSIONS.md) for setup.

### Fixed

- **`CurrentTask.timeSpentOnDay` type** corrected from `number` to `Record<string, number>` — the SP Local REST API returns a per-day key-value map when a task is being tracked. The previous type produced `NaN` from `value / 3600000` divisions in `current-task.tsx` and `menu-bar.tsx`; both files now sum object values.

### Changed

- **Browse Projects drill-down** now uses Raycast's native navigation stack and matches the live task views with Resume Tracking and Mark Complete actions.
- **`README.md`** gained a `## Keyboard shortcuts` section with a shortcut table.
- **`docs/FOCUS-SESSIONS.md`** gained a `## Resume Tracking and focus sessions` section explaining that Resume fires the same focus-session wiring as Start.
