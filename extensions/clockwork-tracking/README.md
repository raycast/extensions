# Clockwork Time Tracking

Track time in [Clockwork Pro](https://marketplace.atlassian.com/apps/1218539/clockwork-pro-timesheets-time-tracking-reports) for Jira directly from Raycast.

## Features

- **Menu Bar Timer** - See active tracking at a glance
- **Start/Stop Tracking** - Quick issue selection with status grouping
- **View Time Entries** - Browse logged time by period
- **Today's Total** - Summary of time tracked today

## Setup

1. **API Token** - Get from Jira: `Apps > Clockwork > API Tokens`
2. **Jira Base URL** - Your instance URL (e.g., `https://mycompany.atlassian.net`)
3. **Account ID** (optional) - Find in your Jira profile URL after `/people/`. Filters worklogs to only yours.

## Commands

| Command | Description |
|---------|-------------|
| Clockwork Menu Bar | Shows current tracking in menu bar |
| Start Tracking Time | Select an issue to track |
| Stop Tracking Time | Stop and log current timer |
| View Time Entries | Browse worklogs by period |
| Today's Total Time | Summary grouped by issue |
| Open Clockwork in Jira | Opens Clockwork timesheet |
| Open Current Issue | Opens tracked issue in browser |

## Script Command (Optional)

For inline status in Raycast search results, add the script command:

```bash
chmod +x scripts/clockwork-status.sh
ln -s "$(pwd)/scripts/clockwork-status.sh" ~/Library/Application\ Support/Raycast/Script\ Commands/
```
