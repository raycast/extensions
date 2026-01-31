# TaskNotes Raycast Extension

Quick task capture and management for the [TaskNotes](https://github.com/callumalpass/tasknotes) Obsidian plugin.

## Prerequisites

- macOS
- [Raycast](https://raycast.com/)
- [Obsidian](https://obsidian.md/)
- [TaskNotes plugin](https://github.com/callumalpass/tasknotes) with HTTP API enabled

## Installation

### Option 1: Raycast Store (Recommended)

Search for "TaskNotes" in the Raycast Store and install.

### Option 2: From Source

```bash
git clone https://github.com/mystic/tasknotes-raycast-extension.git
cd tasknotes-raycast-extension
npm install
npm run dev
```

## Setup

### 1. Enable TaskNotes HTTP API

In Obsidian:

1. Open Settings > Community plugins > TaskNotes
2. Enable **HTTP API**
3. Note the port number (default: 8080)
4. (Optional) Set an **API Token** if you want to require authentication

### 2. Configure the Extension

On first launch, Raycast will prompt for configuration:

- **API Port** — The port TaskNotes is running on (default: 8080)
- **API Token** — Must match the token set in TaskNotes settings (optional, only if authentication is enabled)

To change later: Raycast > Extensions > TaskNotes > Preferences

## Commands

| Command | Description |
|---------|-------------|
| Quick Add Task | Create a task instantly |
| View Tasks | Browse, search, filter, and complete tasks |
| Check TaskNotes Connection | Verify the API is reachable |
| TaskNotes Menu Bar | Shows open task count (background) |

## Troubleshooting

**"Cannot connect to TaskNotes"**
- Ensure Obsidian is running
- Verify TaskNotes plugin is enabled
- Check HTTP API is enabled in TaskNotes settings
- Confirm the port matches your preference

**"HTTP 401" or "Unauthorized"**
- Check if TaskNotes has authentication enabled
- Verify the API token in extension preferences matches TaskNotes

**Menu bar not updating**
- The menu bar refreshes every 10 minutes
- Use "View Tasks" for real-time data

## License

MIT
