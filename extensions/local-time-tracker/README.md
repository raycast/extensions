# Local Time Tracker

Track project work entirely inside Raycast. Local Time Tracker uses no server, external API, or external database.

## Features

- Manage client and internal projects
- Mark one project as preferred for faster timer starts
- Start and stop a single active timer
- Keep the task description optional
- Reuse recent task descriptions for each project
- See elapsed time in the menu bar
- Search, edit, delete, and manually add work logs
- Review today, this week, or this month
- Break totals down by project and project type
- Split work accurately across day, week, and month boundaries

## Getting Started

1. Open **Projects** and add at least one project.
2. Optionally mark a project as preferred. It will be selected first in **Start Work**.
3. Open **Menu Bar Timer** once to enable the menu bar item and background refresh.
4. Configure global shortcuts in Raycast Settings if desired.

Suggested shortcuts:

```text
Start Work  ⌥⌘T
Stop Work   ⌥⌘S
```

## Development

Requirements:

- macOS
- Raycast
- Node.js 22.14 or later
- npm 7 or later

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run lint:ray
npm test
npm run build
```

## Storage and Privacy

Projects, work logs, and the active timer are stored as JSON in Raycast `LocalStorage`.

- Work data never leaves the Mac through this extension.
- No analytics, network requests, or external services are used.
- Data is not synchronized between Macs.
- Removing the extension or clearing its Raycast data may permanently remove work logs.
- Export and import are not included in the current version.

## Install from Source on Another Mac

```bash
git clone <repository>
cd local-time-tracker
npm ci
npm run dev
```

Each Mac starts with its own empty project list, work logs, and timer state.
