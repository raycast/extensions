# Focus Sessions — Implemented Plan

Reflects the plan we actually implemented (Storage-based MVP, no Calendar).

---

## 1. Prior art (reference only)

**[raycast-focus-stats](https://github.com/raycast/extensions/tree/main/extensions/raycast-focus-stats)** uses the same log predicate and start/summary idea. We diverge: we use **Raycast Storage** for sessions (no SQLite, no Apple Calendar in MVP).

---

## 2. Data storage (implemented)

- **Raycast Storage API** (LocalStorage):
  - `focusSessions` — JSON array of `StoredSession` (goal, start as ISO string, duration in minutes). Source of truth for the session list.
  - `lastSyncedAt` — ISO string for incremental log fetch (first sync = last 7 days, then since last sync).
- **No Preferences** in MVP (no calendar name; no other prefs).
- **macOS only** — `platforms: ["macOS"]` in package.json.

---

## 3. Log parsing (implemented)

- **Command:** `log show --predicate 'subsystem == "com.raycast.macos" AND category == "focus"' --info --start "<YYYY-MM-DD HH:MM:SS>"`.
- **Actual log format:**
  - **Main lines** start with `YYYY-MM-DD HH:MM:SS.microseconds+tz` (e.g. `2026-01-29 15:39:51.831992+0530`). **Continuation lines** are indented (no leading timestamp).
  - **Start:** Main line contains `Start focus session`. Timestamp = first two tokens; goal from next continuation line `Goal: <text>`.
  - **Summary:** Main line contains `Focus session activity summary`. Timestamp of that line = session end time. Duration is computed in code as (summary time − start time), not read from a `Duration:` field.
- **Implementation:** [src/log-focus.ts](src/log-focus.ts) — `getLogEvents(startAt)`, `matchSessions(events)`. `StartEvent` (goal, start); `SummaryEvent` (endTime). `matchSessions` produces `StoredSession[]` (duration = (endTime − start) in minutes).

---

## 4. Sync (implemented)

- **Shared logic:** [src/sync.ts](src/sync.ts) — `runSync(options?: { throttleMs })`. Returns `SyncResult` (didRun, added, skipped, or error). No UI; caller shows toasts.
- **Flow:** `getLastSyncedAt()` → startDate (or 7 days ago); `getLogEvents(startDate)` → `matchSessions(events)`; merge new sessions into `getStoredSessions()` (dedupe by start+goal); `setStoredSessions(combined)`; `setLastSyncedAt(now)`. If `throttleMs` set and last sync within that window, returns `{ didRun: false }`.
- **Sync command:** [src/sync-focus-sessions.tsx](src/sync-focus-sessions.tsx) — Shows “Syncing…” toast, calls `runSync()`, then updates toast (success / no new sessions / failure). On failure, suggests Full Disk Access if message indicates permission.

---

## 5. Focus Sessions view (implemented)

- **Command:** [src/focus-sessions.tsx](src/focus-sessions.tsx). List by calendar date; default date = today.
- **Date selection:** `Action.PickDate` (“Pick date” in empty view, “Change date” on each item). Selected date stored as ISO date key `YYYY-MM-DD`; `navigationTitle` shows e.g. “Sessions · Today” or “Sessions · Wed, Jan 15, 2025”.
- **Data:** `getStoredSessions()` filtered by selected day (start within that calendar day); `useCachedPromise(getSessionsForDate, [selectedDateKey])`. Display: title “Focus: &lt;goal&gt;”, subtitle start–end time, accessory duration.
- **SWR:** On mount, background sync: show “Syncing…” toast, call `runSync({ throttleMs: 2 min })`, then update toast and `revalidate()` so list refreshes. Stale data shown immediately; fresh after sync.
- **Empty state:** “No sessions for [date]” + “Run Sync Focus Sessions to import from log, or pick another date.” Copy actions on items (title, time).

---

## 6. Commands and files (implemented)

| Command                 | Purpose                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Focus Sessions**      | List sessions for a date (default today). Pick/change date via Action.PickDate. Data from Storage. Background sync on open (throttled). |
| **Sync Focus Sessions** | Sync from system log into Storage (7 days first run, then since last sync). Toasts for progress and result.                             |

**Files**

- [src/focus-sessions.tsx](src/focus-sessions.tsx) — List view, Pick date, SWR.
- [src/sync-focus-sessions.tsx](src/sync-focus-sessions.tsx) — Sync command entry.
- [src/sync.ts](src/sync.ts) — `runSync()` with throttle.
- [src/log-focus.ts](src/log-focus.ts) — Log query and parsing.
- [src/storage.ts](src/storage.ts) — `getStoredSessions`, `setStoredSessions`, `addStoredSession`, `lastSyncedAt`.
- [src/types.ts](src/types.ts) — `FocusSession`, `StoredSession`, `LogEvent`, `StartEvent`, `SummaryEvent`.
- **package.json:** Both commands; `mode: "view"` for Focus Sessions, `mode: "no-view"` for Sync; `platforms: ["macOS"]`; no preferences.

---

## 7. Out of scope (for this plan)

- Calendar integration (read/write Apple Calendar).
- Preferences (e.g. calendar name).
- Any other persistence than Raycast Storage.
