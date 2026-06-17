🚀 **Initial store release.** This is the first version of Super Productivity for Raycast to ship to the Raycast Store. It brings every active task, project, tag, and the current tracker straight into Raycast, with keyboard shortcuts to fire common actions in one keystroke.

---

## Highlights

- **Resume Tracking** for previously-worked tasks — `timeSpent > 0` surfaces a `Resume Tracking (X.Xh spent)` action with a rewind icon (↻), so re-engagement is one keystroke. Same `POST /tasks/{id}/start` endpoint and same `autoStartFocusOnPlay` focus wiring as fresh starts.
- **Keyboard shortcuts** (`Enter`, `Cmd+Shift+C`, `Cmd+E`, `Cmd+Backspace`, `Cmd+R`, `Cmd+[`, `Cmd+N`) on every common action across the 10 commands.
- **Browse Projects drill-down** brought up to parity with the live task views.
- **Cursor-accurate type system** — `CurrentTask.timeSpentOnDay` now matches the per-day map the SP Local REST API actually returns.

---

## What's New

### ✨ Added

- **Resume Tracking** — tasks with `timeSpent > 0` show **Resume Tracking (X.Xh spent)** (↻) instead of **Start Tracking** (▶) across `View Tasks`, `Today's Tasks`, `Scheduled`, `Browse Projects` (drill-down), and `Current Task`. Both paths call the same `POST /tasks/{id}/start` and fire the same SP focus wiring.
- **Keyboard shortcuts** for every common action:
  - `Enter` — Start / Resume Tracking (or Restore / View Tasks on Archived / Projects)
  - `Cmd+Shift+C` — Mark Complete
  - `Cmd+E` — Archive
  - `Cmd+Backspace` — Delete / Delete Permanently
  - `Cmd+R` — Refresh (all list views)
  - `Cmd+[` — Back to Projects (drill-down)
  - `Cmd+N` — Create Tag
- **Unit tests** for `src/api.ts` (24) and `src/utils.ts` (12) with Vitest — covering success paths, errors, HTTP/API/connection failures, toast assertions, and edge cases. CI now runs them on every push/PR.
- **MIT LICENSE** file.
- **Auto-focus on tracking** — flip SP's `autoStartFocusOnPlay` toggle and Raycast's start actions will create focus sessions. See [`docs/FOCUS-SESSIONS.md`](https://github.com/pvnkmnk/raycast-super-productivity/blob/v0.1.0/docs/FOCUS-SESSIONS.md) for setup.
- **Store-listing mockup screenshots** in [`assets/screenshots/`](https://github.com/pvnkmnk/raycast-super-productivity/tree/v0.1.0/assets/screenshots) — Resume badge, Keyboard shortcuts, Project drill-down. Replace with real in-app captures from a Mac when convenient.

### 🐛 Fixed

- **`CurrentTask.timeSpentOnDay` type** corrected from `number` to `Record<string, number>` — the SP Local REST API returns a per-day key-value map when a task is being tracked. The previous type produced `NaN` from `value / 3600000` divisions in `current-task.tsx` and `menu-bar.tsx`; both now sum object values.
- **QA exercise** `CURRENT_FIELDS` updated to validate the per-day object shape.
- **QA exercise** now verifies start-tracking behavior — after `POST /tasks/{id}/start`, fetches `GET /task-control/current` and confirms the correct task is active.

### 🔧 Changed

- **Browse Projects drill-down** matches live task views: Resume Tracking (↻ for tasks with `timeSpent > 0`, ▶ otherwise), `Cmd+Shift+C` for Mark Complete, Back / Refresh in their own section for cleaner action-panel hierarchy.
- **Action titles** in `View Tasks` and `Current Task` now append `(+ Focus Session)`.
- **QA contract tests** gated on `SP_API_URL` — skip gracefully when local SP isn't reachable in CI.
- **CI** now runs `tsc --noEmit`, `eslint --max-warnings 0`, `prettier --check`, `vitest run`, and `ray build` on every push/PR.
- **QA exercise** rewritten with shared field-config reuse (`TASK_BASE_FIELDS`, `STR_ARR`, `OBJ_ARR`, `CREATE_BODY_FIELDS`).
- **`README.md`** gained a `## Keyboard shortcuts` section with a shortcut table and `## Smart resume`/Keyboard bullets.
- **`docs/FOCUS-SESSIONS.md`** gained a `## Resume Tracking and focus sessions` section explaining that Resume fires the same focus-session wiring as Start.

---

## Install

### From the Raycast Store (when published)

Search **"Super Productivity"** in Raycast.

### From source

```bash
git clone https://github.com/pvnkmnk/raycast-super-productivity
cd raycast-super-productivity
npm install
npm run dev
```

Make sure **Super Productivity** is running with `Settings → Misc → Enable local REST API` turned on
(default `http://127.0.0.1:3876`).

> 💡 **Want focus sessions to start automatically when you begin tracking?** See [`docs/FOCUS-SESSIONS.md`](https://github.com/pvnkmnk/raycast-super-productivity/blob/v0.1.0/docs/FOCUS-SESSIONS.md) — flip SP's `autoStartFocusOnPlay` toggle and you're done.

---

## Full Changelog

See [`CHANGELOG.md`](https://github.com/pvnkmnk/raycast-super-productivity/blob/v0.1.0/CHANGELOG.md) on the v0.1.0 tag for the full list of changes.
