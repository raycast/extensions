# CalTask

Track your tasks with a timer and export them to Mac Calendar. Generate time reports from your calendar events.

## Features

### CalTask

- Start/stop timer for tasks with one click
- Auto-suggest recent tasks for quick restart
- Assign tasks to specific calendars
- Add notes and URLs to tasks
- Auto-export to Mac Calendar when timer stops
- View task history with export status
- Menu bar display showing current timer and elapsed time

### CalTask Report

- Generate time reports from Mac Calendar events
- Filter by time range (Today, Yesterday, This Week, Last Week, This Month, Last Month, Custom)
- Select which calendars to include (selection persists)
- View time breakdown by calendar with real calendar colors
- See percentage distribution of time spent
- List all events with duration details

## Commands

| Command              | Description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| **CalTask**          | Main dashboard - view current timer, task history, and export to Calendar |
| **CalTask Report**   | Generate time reports from Mac Calendar events                            |
| **CalTask Menu Bar** | Shows current task timer in the menu bar                                  |

## Usage

### Starting a Timer

1. Open **CalTask** command
2. Select "Start New Timer" or press Enter
3. Enter task name (or select from recent tasks)
4. Choose a calendar to export to (or "Don't export")
5. Optionally add notes and URL
6. Press Enter to start tracking

### Stopping a Timer

- From **CalTask** command: Select the running task and press Enter
- From **Menu Bar**: Click the timer and select "Stop & Export to Calendar"
- The task will automatically export to your selected calendar

### Generating Reports

1. Open **CalTask Report** command
2. Select which calendars to include (checkmark = selected)
3. Choose time range from the dropdown
4. Press ⌘ + Enter to generate report
5. View total time, breakdown by calendar, and event list

## Requirements

- macOS (uses native Calendar integration)
- **CalTask Report** requires Xcode Command Line Tools for fast calendar access:
  ```bash
  xcode-select --install
  ```

## Permissions

On first use, macOS will prompt you to grant Raycast access to your Calendar. This is required for both exporting tasks and generating reports.

## Auto Cleanup

To prevent storage bloat, CalTask automatically manages task history:

- **Exported tasks**: Removed after 7 days
- **Unexported tasks**: Keeps only the latest 50
