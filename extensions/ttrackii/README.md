# ttrackii for Raycast

Start, stop, and review your [ttrackii](https://ttrackii.com) time without leaving Raycast.

## Setup

1. In ttrackii, turn on **Settings → API & CLI → Allow API access**.
2. Open any ttrackii command in Raycast and press ↵ on **Connect to ttrackii**. Approve the code in your browser; the command continues once you approve.
3. Optionally activate **Menu Bar Timer** from Raycast's root search.

The Raycast session lasts 72 hours, then the commands ask you to connect again. **Sign out** is in every command's action panel (⌘K).

## Commands

| Command | What it does |
| --- | --- |
| Timer | Start a timer with a task, workspace, project, any number of tags, and a rate (Default, Non-billable, or Custom). While a timer runs, ↵ on it stops it; type a task to rename it or switch to a new timer. |
| Recent Entries | The running timer, then all your entries newest first, grouped by day. Search covers task, project, and every tag. Continue an entry, or edit it and start. |
| Reports | Totals, change against the previous period, daily average, billable amounts, busiest day, top project, tag, and task, and breakdowns for a timeframe. |
| Menu Bar Timer | Elapsed time in the menu bar while a timer runs; the menu offers Stop, Edit, Start/Switch, Recent Entries, Reports, and Open ttrackii. |

Projects and tags show in their ttrackii colors. Default billing uses the first tag with a rate, then the project, as the web app does. Full Business Insights (goals, forecasts, currency conversion) stay in the web app.

## Requests and refresh

The extension uses your account's hourly API quota, shared with the ttrackii CLI and API keys.

- While a timer runs, the menu bar checks ttrackii every five minutes, so a timer stopped in another app disappears. While nothing runs it makes no background requests; opening the menu refreshes it.
- Workspaces, projects, and tags are cached for five minutes, and each report timeframe for two minutes.
- Background refreshes pause when five requests remain, so your own start and stop actions still go through.
- Starting and stopping are never queued or retried automatically. After a failure, the command reloads so you can see what happened.

## Privacy

Your ttrackii session is stored in Raycast's secure storage, separately from the ttrackii CLI. Local storage holds only your workspace choice, cached timer, lookup, and report data, and rate-limit info; it is cleared when you sign out or connect another account. Signing out revokes the session; if that can't be confirmed, remove it in ttrackii under **Settings → Sign-in & security**.

## Development

Requires Node 22 and npm.

```sh
npm install
npm run dev
npm run typecheck && npm run lint && npm test && npm run build
```
