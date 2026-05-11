# Cron Job Manager — Raycast Extension

Manage your macOS cron jobs directly from Raycast.

## Features

- **View all cron jobs** — active, disabled, and environment variables grouped separately
- **Human-readable schedules** — "Every day at 9 AM" instead of `0 9 * * *`
- **Next run time** — see when each job will run next, shown inline in the list
- **Add jobs** — choose from presets or enter a custom cron expression, with a live preview showing the next 5 run times
- **Edit jobs** — update schedule, command, or label
- **Delete jobs** — with confirmation
- **Labels** — add an optional friendly name stored as an inline `#` comment
- **Disabled job detection** — lines commented out with `#` show as disabled

## Installation

```bash
cd cron-manager
npm install
npm run build
```

Then open Raycast → Import Extension → point to this folder.

Or run in dev mode:

```bash
npm run dev
```

## Usage

1. Open Raycast and search **"Manage Cron Jobs"**
2. Browse your existing jobs — next run time is shown on each row
3. Press `⌘N` to add a new job
4. Press `⌘E` or select **Edit** on any job to modify it
5. Press `Ctrl+X` or select **Delete** to remove a job

## Schedule Presets

The Add/Edit form includes common presets:
- Every minute, 5m, 15m, 30m, hourly
- Daily at midnight / 9 AM
- Weekdays at 9 AM
- Weekly, monthly, yearly
- At reboot (`@reboot`)
- Custom cron expression with live preview

## Requirements

- macOS with `crontab` available
- Raycast
- Node.js 18+

## How it works

The extension reads and writes your user crontab via `crontab -l` and `crontab -`. All changes are applied immediately. It parses each line to detect schedules, commands, inline comments (used as labels), and disabled (commented-out) entries.
