# CalTask

Track your tasks with a timer and export them to Mac Calendar. View upcoming
events, search your calendar history, create and edit events, and generate
time reports — all from Raycast.

## Features

### CalTask (Main Dashboard)

- Start/stop task timer with one click
- View upcoming calendar events and recent history
- Start a timer from any existing calendar event (updates the original event on stop)
- Restart timers from recent events or local tasks
- Auto-export to Mac Calendar when timer stops
- AI-powered natural language search (e.g., "meetings last week", "dentist tomorrow")
- Search results grouped by date with time range filtering
- Create, edit, and delete calendar events directly
- Recurring event support: edit or delete individual occurrences or future events
- Calendar color-coded event display with account names
- Events caching for fast startup

### Start Timer

- Enter task name or select from recent task suggestions (auto-fills calendar, notes, and URL)
- Quick Add with AI: type a natural description and press ⌘⇧P to auto-fill all fields
- Choose a calendar to export to, or select "Don't export"
- Add optional notes and URL
- Auto-stops and exports any running timer when starting a new one

### CalTask Report

- Generate time reports from Mac Calendar events
- Filter by time range: Today, Yesterday, This Week, Last Week, This Month, Last Month, or Custom
- Select which calendars to include (selection persists between sessions)
- View total time, breakdown by calendar with real calendar colors, and percentage distribution
- Select All / Deselect All for quick calendar toggling
- List all events with duration details

### Manage Calendars

- Toggle which calendars are visible across all CalTask commands
- Set a default calendar for new timers and events
- Show All / Hide All Except Default bulk actions
- Calendars grouped by account with visibility status and default badge

### CalTask Menu Bar

- Shows current task timer and elapsed time in the menu bar
- Tooltip displays current task name
- Stop and export directly from menu bar (⌘S)
- Start a new timer (⌘N) or open the main dashboard (⌘O)
- Auto-refreshes every 10 seconds

### Event Form

- Full event creation and editing with title, calendar, start/end date, and all-day toggle
- Recurrence rules: Daily, Weekly, Monthly, Yearly
- Alarm reminders: at time of event, 5/15/30 minutes, 1/2 hours, or 1 day before
- Location, URL, and notes fields
- Quick Add with AI (⌘⇧P): describe an event in natural language to auto-fill all fields
- Default event duration applied when no end time is set

## Commands

| Command              | Description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| **CalTask**          | Main dashboard — view current timer, upcoming events, history, and search |
| **CalTask Report**   | Generate time reports from Mac Calendar events                            |
| **Manage Calendars** | Toggle visible calendars and set default calendar                         |
| **CalTask Menu Bar** | Show current task timer in the menu bar                                   |

## Preferences

Configure in Raycast Settings → Extensions → CalTask:

| Preference                 | Description                                      | Default          |
| -------------------------- | ------------------------------------------------ | ---------------- |
| **AI Model**               | AI model for natural language features           | Claude 4.5 Haiku |
| **Upcoming Events Days**   | Number of days ahead to show in Upcoming section | 7                |
| **Recent History Days**    | Number of days back to show in Recent History    | 30               |
| **Default Event Duration** | Default duration for events without an end time  | 60 minutes       |

Supported AI models: Claude (Haiku, Sonnet, Opus), GPT-4o, GPT-4.1, Gemini 2.5, and Perplexity Sonar.

## Usage

### Starting a Timer

1. Open **CalTask** command
2. Select "Start New Timer" or press Enter
3. Enter task name (or select from recent tasks to auto-fill)
4. Choose a calendar to export to (or "Don't export")
5. Optionally add notes and URL
6. Press Enter to start tracking

> **Tip:** Use Quick Add (⌘⇧P) to type something like "code review on Work" and let AI fill in the fields.

### Starting a Timer from a Calendar Event

1. From **CalTask**, find an event in Upcoming or Recent History
2. Press Enter to start a timer linked to that event
3. When you stop, the original event is updated with your actual time

### Stopping a Timer

- From **CalTask** command: select the running task and press Enter
- From **Menu Bar**: click the timer and select "Stop & Export to Calendar"
- Starting a new timer automatically stops and exports the current one

### Creating Events

1. From **CalTask**, press ⌘N to open the event form
2. Fill in title, calendar, dates, recurrence, alarm, location, URL, and notes
3. Or use Quick Add (⌘⇧P) to describe the event in natural language
4. Press Enter to create

### Editing and Deleting Events

- Press ⌘E on any event to edit
- Press ⌘⌫ to delete (for recurring events, choose "Only This One" or "This and Future")

### Searching Events

1. From **CalTask**, type in the search bar
2. **With Raycast Pro**: use natural language (e.g., "meetings last week", "Work calendar this month")
3. **Without AI**: text search with configurable time range dropdown (This Week to All Time)
4. Results are grouped by date with full action support

### Generating Reports

1. Open **CalTask Report** command
2. Select which calendars to include (checkmark = selected)
3. Choose time range from the dropdown
4. Press ⌘Enter to generate report
5. View total time, breakdown by calendar, and event list

### Managing Calendars

1. Open **Manage Calendars** command
2. Press Enter to toggle a calendar visible/hidden
3. Select "Set as Default" to set the default calendar for new timers and events
4. Use "Show All Calendars" or "Hide All Except Default" for bulk changes

## Keyboard Shortcuts

| Shortcut | Action                    | Context            |
| -------- | ------------------------- | ------------------ |
| ⌘N       | New Event                 | CalTask dashboard  |
| ⌘E       | Edit Event                | CalTask dashboard  |
| ⌘R       | Refresh                   | CalTask dashboard  |
| ⌘⌫       | Delete Event              | CalTask dashboard  |
| ⌘⇧P      | Parse with AI (Quick Add) | Timer / Event form |
| ⌘Enter   | Generate Report           | CalTask Report     |
| ⌘S       | Stop & Export             | Menu Bar           |
| ⌘N       | Start Timer               | Menu Bar           |
| ⌘O       | Open Task Timer           | Menu Bar           |

## Requirements

- macOS (uses native Calendar integration via EventKit)
- Xcode Command Line Tools (required to compile the Swift calendar helper):
  ```bash
  xcode-select --install
  ```
- AI features (Quick Add, natural language search) require Raycast Pro

## Permissions

On first use, macOS will prompt you to grant Raycast access to your Calendar.
This is required for all calendar operations.
