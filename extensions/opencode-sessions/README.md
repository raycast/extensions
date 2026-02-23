# OpenCode

Browse, search, and manage your [OpenCode](https://github.com/sst/opencode) sessions and commands.

View full transcripts, generate summaries, manage session data, and create custom commands directly from Raycast.

## Features

### OpenCode Sessions
- Browse all sessions with time-grouped sections (Today, Yesterday, This Week, etc.)
- Filter sessions by project
- View full conversation transcripts with tool usage details
- Generate AI-powered session summaries
- Copy transcripts, session IDs, slugs, and resume commands
- Open project directories and share links
- Delete individual sessions or all sessions for a project

### OpenCode Commands
- View and filter all system and custom OpenCode commands
- Create new custom commands directly via a Raycast form
- Edit and Delete functionality for user-created commands
- **Primary Action (Enter):** Copy command to clipboard
- **Secondary Action (Cmd+Enter):** Paste command into active application

### OpenCode Usage Cheatsheet
- Quick reference for TUI, CLI, and Web commands with category filtering

## Configuration

By default, the extension reads session data from `~/.local/share/opencode/storage`.
You can override this path in the extension preferences if your OpenCode data is stored elsewhere.
