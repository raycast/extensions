# Time Tracker for Raycast

A simple time tracking extension for Raycast that lets you quickly start and switch between client/project time tracking, with reports and a summary dashboard.

## Features

- **Quick Time Tracking** — Start tracking with a client name, automatically stop the previous timer
- **Long Session Handling** — Sessions over 1 hour prompt you to cap, adjust, or keep the full duration
- **Daily Reports** — View per-day breakdowns with client percentages
- **Summary Dashboard** — Weekly hours per client with a distribution chart
- **Entry Management** — Manually add, edit, or delete time entries
- **Local CSV Storage** — All entries saved as CSV for easy export
- **15-Minute Billing Increments** — Durations rounded up to the nearest 15 minutes

## Commands

### Track Time
Start or switch time tracking. Enter a client/project name and tracking begins immediately. Starting a new client automatically stops the previous timer.

### Stop Tracking
Stop the current timer and save the entry. If the session ran longer than 1 hour, you'll be prompted to choose how to record it (cap at 1 hour, specify a custom stop time, or keep the full duration).

### Time Tracking Status
View the currently active timer and today's per-client summary.

### Time Report
Daily breakdown of tracked time. Use the dropdown to filter by Today, Last 7 Days, Last 30 Days, or All Time.

### Time Summary
Dashboard view with a distribution chart showing relative time per client, plus weekly breakdowns. Switch between Last 7 Days, Last 30 Days, Last 3 Months, or All Time.

### Manage Time Entries
View all recorded entries. Add new entries manually, edit existing ones, or delete entries.

## Data Storage

Time entries are stored locally as CSV:

```
~/Library/Application Support/com.raycast.macos/extensions/timetrack/time-entries.csv
```

Format:
```csv
client,startTime,endTime,durationMinutes
"client 1","2024-02-09T10:00:00.000Z","2024-02-09T11:30:00.000Z",90
```
