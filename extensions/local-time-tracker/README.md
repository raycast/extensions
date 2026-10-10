# Local Time Tracker

Track project work entirely inside Raycast. Local Time Tracker uses no server, external API, or external database.

## Features

- Manage client and internal projects
- Mark one project as preferred for faster timer starts
- Start and stop a single active timer
- Choose from registered project categories
- Keep task descriptions optional and reuse recent descriptions for each project
- See elapsed time in the menu bar
- Search, edit, delete, and manually add work logs
- Review today, this week, or this month
- Break totals down by project and project type
- Split work accurately across day, week, and month boundaries

## Getting Started

1. Open **Projects** and add the categories and projects you work with.
2. Optionally mark a project as preferred so it is selected first in **Start Work**.
3. Open **Start Work**, choose a project, and optionally enter a task description.
4. Open **Menu Bar Timer** once to enable the menu bar item and background refresh.

You can set global shortcuts for **Start Work** and **Stop Work** in Raycast Settings. Suggested shortcuts:

```text
Start Work  ⌥⌘T
Stop Work   ⌥⌘S
```

## Storage and Privacy

Projects, work logs, and the active timer are stored as JSON in Raycast `LocalStorage`.

- Work data never leaves the Mac through this extension.
- No analytics, network requests, or external services are used.
- Data is not synchronized between Macs.
- Removing the extension or clearing its Raycast data may permanently remove work logs.
- Export and import are not included in the current version.
