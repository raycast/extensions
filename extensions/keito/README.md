# Keito

Track time in [Keito](https://keito.ai) without leaving Raycast. Start, stop, and switch timers, log and edit entries, keep favorites, and see your running timer in the menu bar.

## Raycast 1.x installation

This build targets Raycast **1.104.32 on macOS**, using pinned versions of `@raycast/api` (1.103.3) and `@raycast/utils` (1.19.1). It passes build and lint checks against that SDK; it still needs a runtime check in Raycast 1.104.32.

With Node.js 22.14 or later installed, run these commands from this folder:

```sh
npm ci
npm run dev
```

The development command imports the extension into Raycast. Open **Keito Connection** in Raycast to check sign-in and project access. Use **Stop Timer** and **Running Timer** to check timer actions and the menu bar. Stop the development command with Ctrl+C when finished.

`npm run build` writes a compiled build to `dist/`. Keep the pinned SDK versions when rebuilding for Raycast 1.x.

### Sharing with a teammate

Share the source folder, including `package-lock.json`, `src/`, and `assets/`. Exclude `node_modules/`, `.git/`, `dist/`, and any `.env` files. Your teammate should extract it to a permanent folder, run `npm ci` and `npm run build`, then run `npm run dev` to import it into Raycast. Each person signs in with their own Keito account or enters their own integration key in Raycast preferences. No Store submission is needed.

## Getting started

Open any Keito command and choose **Sign in with Keito**. Your browser opens Keito's sign-in page and then returns you to Raycast. You stay signed in, and the extension renews access automatically.

Then run **Keito Connection** to confirm everything works. It checks your sign-in, the account and company in use, and that you can see your projects and tasks. It also shows your workspace settings: timezone, entry format, required notes, and rounding. To sign out, use **Sign out of Keito** in that command (⌘⇧L).

### Using an integration key instead

If you prefer, or you track time as a Keito Agent, enter both of these in the extension preferences:

- **Keito Integration API Key:** a **full-access integration key** (`kto_…`). A Keito Administrator creates it under **Settings → API & Developers → Integration keys**, selects *you* as the identity, and chooses **All permitted operations**.
- **Keito Company ID:** shown under **Settings → API & Developers → Company ID**.

A personal read-only sync key can't track time, and the extension tells you if you enter one. Leave both fields blank to sign in with Keito.

## Commands

| Command | What it does |
| --- | --- |
| **Keito Connection** | Sign in or out, check your connection, and see your account and workspace settings |
| **New Time Entry** | Start a timer (leave the duration blank) or log completed time |
| **Today's Timesheet** | Your entries for a day. Stop, restart, edit, duplicate, or delete them, or start a past entry again today |
| **Favorites** | Saved project, task, and notes combinations that start a timer or log a fixed duration |
| **Stop Timer** | Stop your running timer |
| **Toggle Timer** | Stop the running timer, or restart today's most recently updated entry |
| **Running Timer** | Menu bar item with the running timer and today's total (enable it in Raycast settings) |
| **Reset Local Keito Data** | Clear cached projects, tasks, and entries. Favorites are kept |

## Tips

- In the timesheet, ⌘← and ⌘→ move between days, and ⌘T jumps back to today. Pick an old entry and choose **Start on Today** to reuse its project, task, and notes.
- Keito allows one running timer. If another timer is running, the extension shows which one and asks before switching. Toggle Timer and the menu bar never switch timers on their own.
- Approved and locked entries show a tag and a lock icon, and can't be edited or deleted.
- Durations accept `1:30`, `1.5`, `1h30m`, `90m`, simple math like `1+15m-5m`, and `since 9am`.
- "Today" follows your Keito workspace's timezone.
- Each Keito account and company has its own favorites, so switching accounts never mixes them.

## Preferences

| Preference | Notes |
| --- | --- |
| Time Format | Show durations as `1:30` or `1.50` |
| Entry Fields | **Company Default** follows your workspace's entry format. You can also choose **Duration** or **Start and End Times** (in the workspace timezone) |
| Title Field, client options | What to show as the title in lists, and whether to show client names |
| Sort By (Timesheet) | Order entries by updated or created time |
| Status Folder (Running Timer) | See below |

Running durations in the timesheet and menu bar combine Keito's saved seconds with the time since the latest timer start. Restarting an entry preserves its earlier time. The clock checks every second and redraws when a displayed duration changes; changes made in Keito are fetched every minute or when you use **Refresh**. Durations follow your Time Format preference and do not apply workspace billing rounding.

### Status folder

If you set **Status Folder** on the Running Timer command, the menu bar writes `currentTimer.json` to that folder while a timer runs and deletes the file when no timer is running. Automation tools such as Keyboard Maestro or Hazel can watch it. The menu bar command must be enabled. The file never contains credentials:

```json
{
  "schema": "keito-raycast/current-timer@1",
  "company_id": "…",
  "id": "…",
  "is_running": true,
  "spent_date": "2026-10-15",
  "hours": 1.25,
  "timer_started_at": "2026-10-15T09:00:00Z",
  "started_time": "09:00",
  "notes": "…",
  "project": { "id": "…", "name": "…", "code": "…" },
  "task": { "id": "…", "name": "…" },
  "client": { "id": "…", "name": "…" },
  "approval_status": "unsubmitted",
  "updated_at": "…"
}
```

## Limitations

- Only time entries are supported. Expenses, timesheet submission, and invoices are not.
- **Open Keito** opens the Keito web app, or the Keito app if it's installed.
- Signing out removes your sign-in from Raycast. To revoke access everywhere, use Keito's web app.

## Credits

Based on the Harvest extension by eluce2.
