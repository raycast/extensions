# TimeTrack Raycast Extension

A Raycast extension for macOS and Windows that integrates with the MBC Kanban time tracking API.

## Features

- Track time directly from Raycast
- Search interface to enter your time tracking message
- Stores recent entries for quick reuse
- Shows timestamp for each tracked entry
- Direct API integration with MBC Kanban

## Setup

1. Install the extension in Raycast
2. Configure the extension preferences:
   - **User ID**: Your MBC Kanban user ID
   - **API Key**: Your authentication API key
   - **API URL**: The time tracking API endpoint (default: https://production.mcb.dk/timetracker/starttimetracking)

## Usage

1. Open Raycast (Option+Space on macOS, Alt+Space on Windows, or your configured hotkey)
2. Type "Track Time" to find the command
3. Enter your time tracking message (e.g., "Started project X")
4. Press Enter to submit

The extension will send your message to the MBC Kanban API and show a confirmation. Your recent entries are saved locally for quick access.

## Development

### Install Dependencies
```bash
npm install
```

### Build the Extension
```bash
npm run build
```

### Run in Development Mode
```bash
npm run dev
```

This will start Raycast in development mode and you can test the extension.

### Lint
```bash
npm run lint
```

## Requirements

- Raycast must be installed (macOS or Windows)
- Valid MBC Kanban API credentials
