# Tempo

Log and manage work hours with Tempo.

## Features

- **Add Worklog**: Quickly log work hours to any issue with flexible duration formats (1h, 1h30m, 2h)
- **Time Range Entry**: Optionally enter start and end times and let the extension derive the duration for you
- **List Worklogs**: View recent work logs grouped by day with total hours and chronological ordering when start times are available
- **Edit & Delete**: Modify durations or remove work logs directly
- **Issue Selection**: Browse favorites, recent activity, assigned issues, and project issues
- **Smart Search**: Find issues quickly with auto-complete
- **Favorites**: Star frequently-used issues for quick access
- **Remembered Input Mode**: Keep the preferred worklog entry mode between runs

## Setup

This extension requires configuration of both Tempo and Jira credentials:

### 1. Tempo API Token

1. In the Tempo UI, go to **Settings** > **API Integration**
2. Create a new API token
3. Copy the token and add it to the extension preferences

### 2. Jira API Token

This extension integrates with Jira for issue management. You'll need:

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage/api-tokens)
2. Create a new API token (no scopes required)
3. Copy the token and add it to the extension preferences

### 3. Jira Configuration

You'll also need to provide:

- **Jira Base URL**: Your Jira instance URL (e.g., `https://yourcompany.atlassian.net`)
- **Jira Email**: Your Jira account email address
- **Default Project Key** (optional): Your preferred project prefix for quick suggestions (e.g., `PROJ` for issues like `PROJ-123`)

## Usage

### Adding a Worklog

1. Open the "Add Worklog" command
2. Select an issue from favorites, recent activity, assigned issues, or search
3. Choose one of the following input modes:
   - Enter a duration directly (for example `1h`, `1h30m`, `45m`, `2h`)
   - Enable **Use Start and End Time** to derive the duration from a time range
4. Optionally add a description
5. Select the date or enter a custom date
6. Submit to log your work

The extension remembers whether you prefer duration entry or start/end time entry, so you do not need to switch modes every time.

### Viewing Worklogs

1. Open the "List Worklogs" command
2. Browse worklogs grouped by day
3. Use actions to edit duration, delete, or add issues to favorites
4. Click "Load More" to view older work logs (pagination week per week)

## Duration Formats

The extension supports flexible duration formats:

- Hours: `1h`, `2h`, `8h`
- Minutes: `30m`, `45m`
- Combined: `1h30m`, `2h15m`
- Decimal: `1.5h`, `2.25h`
- Shorthand: `1h30` (hours and minutes without 'm')

## Time Range Formats

When using start and end time entry, the extension accepts the following 24-hour formats:

- Colon format: `8:00`, `08:00`, `17:30`
- Hour format: `8h`, `9h`, `17h`
- Hour and minutes format: `8h30`, `17h45`

The end time must be after the start time on the same day.

## Future Integrations

This extension is designed to work with Tempo and is ready to integrate with additional tools beyond Jira in future versions.
