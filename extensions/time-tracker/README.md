# Time Tracker - Raycast Extension

Simple manual time tracking with local JSON storage synchronized via Google Drive.

## Features

- **Log Time**: Quickly log time spent on projects with smart duration parsing
- **View Entries**: Browse, search, filter and manage your time entries
- **Manage Projects**: Create, edit, archive, and organize your projects
- **Smart Defaults**: Auto-selects last used project and today's date
- **Flexible Duration Input**: Accepts formats like `2.5`, `2h30`, `2:30`, `30m`
- **Local JSON Storage**: Auto-detects Google Drive path, data stored in `TimeTrack/data.json`
- **Centralized Config**: All settings in `src/utils/config.ts` for easy customization

## Installation

### Prerequisites

- [Raycast](https://raycast.com/) installed
- Node.js 20+ installed
- Google Drive synced to your machine

### Setup

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Development mode:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Usage

### Log Time (Main Command)

The fastest way to log time:

1. Open Raycast and type "Log Time"
2. Select a project (defaults to last used)
3. Enter duration in any format:
   - `2.5` (decimal hours)
   - `2h30` or `2h30m` (hours and minutes)
   - `2:30` (colon format)
   - `30m` (minutes only)
4. Select date (defaults to today)
5. Add optional comment
6. Press Enter to save

### View Entries

Browse and manage your time logs:

- Filter by time period (Today, This Week, This Month, All Time)
- Search entries by project name or comment
- See total hours for filtered period
- View entries grouped by project
- Actions:
  - Edit entry
  - Copy as text
  - Delete entry

### Manage Projects

Organize your projects:

- Create new projects with custom colors
- Edit project details
- Archive inactive projects
- Delete projects (removes all associated entries)
- Filter between active and all projects

## Configuration

All configuration is centralized in [src/utils/config.ts](src/utils/config.ts).

### Data Path

The extension automatically detects your cloud storage folder:

**macOS 12+ (new format):**

- `/Users/[user]/Library/CloudStorage/GoogleDrive-[email]/My Drive/TimeTrack/data.json`

**Legacy paths:**

- `~/Google Drive/TimeTrack/data.json`
- `~/GoogleDrive/TimeTrack/data.json`

### Customize Path

To use a custom path, modify [src/utils/config.ts](src/utils/config.ts:53) or set the environment variable:

```bash
export TIMETRACK_DATA_PATH="/path/to/your/data.json"
```

### Other Configurable Settings

In [src/utils/config.ts](src/utils/config.ts), you can customize:

- Default project colors
- Date display format
- Week start day
- Notification display duration

## Data Format

The JSON file contains your projects and entries:

```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "My Project",
      "color": "#FF6B6B",
      "archived": false,
      "createdAt": "2025-01-05T14:30:00Z"
    }
  ],
  "entries": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "date": "2025-01-05",
      "duration": 2.5,
      "comment": "Developing new feature",
      "createdAt": "2025-01-05T14:30:00Z"
    }
  ]
}
```

## Keyboard Shortcuts

### Log Time
- No shortcuts (optimized for quick entry)

### View Entries
- `Cmd + C` - Copy entry as text
- `Ctrl + X` - Delete entry

### Manage Projects
- `Cmd + N` - Create new project
- `Cmd + A` - Archive/unarchive project
- `Ctrl + X` - Delete project

## Tips

- The extension automatically creates the data directory if it doesn't exist
- Projects are color-coded for easy visual identification
- Archived projects are hidden by default but can be shown via filter
- Duration is always displayed in consistent format (e.g., "2.5h")
- All data syncs automatically via Google Drive

## Development

### Project Structure

```
logtime/
├── src/
│   ├── log-time.tsx           # Main command
│   ├── view-entries.tsx       # View and manage entries
│   ├── manage-projects.tsx    # Project management
│   └── utils/
│       ├── types.ts           # TypeScript interfaces
│       ├── duration.ts        # Duration parsing utilities
│       └── storage.ts         # JSON file operations
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

- `npm run dev` - Start development mode
- `npm run build` - Build extension
- `npm run lint` - Lint code
- `npm run fix-lint` - Fix linting issues

## Troubleshooting

### Google Drive folder not found

Make sure Google Drive is properly synced and the path exists:
```bash
ls ~/Google\ Drive/
```

### Permission errors

Ensure Raycast has permission to access files in your Google Drive folder.

### Data corruption

If the JSON file gets corrupted, simply delete it and the extension will create a fresh one:
```bash
rm ~/Google\ Drive/TimeTrack/data.json
```

## License

MIT
