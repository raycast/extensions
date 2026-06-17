# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-17

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
- **MIT LICENSE** file with standard MIT terms.
- **Auto-focus on tracking** — flipping Super Productivity's `autoStartFocusOnPlay` toggle wires `/tasks/{id}/start` events from this extension to focus-session starts. See [`docs/FOCUS-SESSIONS.md`](docs/FOCUS-SESSIONS.md) for setup.

### Fixed

- **`CurrentTask.timeSpentOnDay` type** corrected from `number` to `Record<string, number>` — the SP Local REST API returns a per-day key-value map when a task is being tracked. The previous type produced `NaN` from `value / 3600000` divisions in `current-task.tsx` and `menu-bar.tsx`; both files now sum object values.
- **QA exercise** `CURRENT_FIELDS` updated to validate `timeSpentOnDay` as the per-day object shape, matching the API contract.
- **QA exercise** now verifies start-tracking behavior — after `POST /tasks/{id}/start`, fetches `GET /task-control/current` and confirms the correct task is now active (catches regressions where SP starts a different task than the one requested).

### Changed

- **Browse Projects drill-down** now has parity with the live task views: Resume Tracking (↻ for tasks with `timeSpent > 0`, ▶ otherwise), `Cmd+Shift+C` for Mark Complete, and Back / Refresh moved into their own section for cleaner Action panel hierarchy.
- **Action titles** in `View Tasks` and `Current Task` now append `(+ Focus Session)`.
- **QA contract tests** gated on `SP_API_URL` so the suite skips gracefully when the local Super Productivity instance isn't reachable in CI.
- **CI** now runs `tsc --noEmit`, `eslint --max-warnings 0`, `prettier --check`, `vitest run`, and `ray build` on every push/PR. PRs must be green before merge.
- **QA exercise** rewritten with shared field-config reuse (`TASK_BASE_FIELDS`, `STR_ARR`, `OBJ_ARR`, `CREATE_BODY_FIELDS`) for faster shape validation cycles.
- **`README.md`** gained a `## Keyboard shortcuts` section with a shortcut table.
- **`docs/FOCUS-SESSIONS.md`** gained a `## Resume Tracking and focus sessions` section explaining that Resume fires the same focus-session wiring as Start.

[0.1.0]: https://github.com/pvnkmnk/raycast-super-productivity/releases/tag/v0.1.0
