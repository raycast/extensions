# Obsidian Daily Capture

Quickly capture timestamped thoughts into your Obsidian daily note without leaving what you're doing.

## Setup

1. Install the extension
2. On first launch, Raycast will ask you to configure:
   - **Vault Path** — the absolute path to your Obsidian vault (e.g. `/Users/you/Documents/MyVault`)
   - **Daily Note Path** — the folder within your vault where daily notes are stored.

## Usage

Open Raycast and search for **Capture Thought**. Type your thought in the text area and press `⌘ + Enter` to submit. The extension appends a timestamped entry to today's daily note:

```
**14:32** - Remember to review the PR
**15:10** - Idea: refactor the auth module
```

If the daily note for today doesn't exist yet, it will be created automatically with the date as a heading.

## Daily Note Format

- **Filename**: `YYYY-MM-DD.md` (e.g. `2026-03-03.md`)
- **Location**: `{vault}/{dailyNotePath}/{filename}`
