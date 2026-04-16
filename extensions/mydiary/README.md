# MyDiary

A native Raycast extension for daily journaling. Log your day with voice or keyboard, browse past days on a calendar, copy to anywhere.

## Commands

| Command | What it does |
|---------|-------------|
| `record day` | Type or dictate entries → save → copy to clipboard |
| `day calendar` | Browse your logged days, click any day to copy |

## Installation (Dev Mode)

```bash
cd /Users/mauriello/Dev/mydiary
npx ray develop
```

## How It Works

- Entries are stored locally in Raycast's LocalStorage
- A calendar view lets you browse any past day
- One tap copies your day's log to clipboard — paste anywhere
- Voice: use TypeWhisper or any voice-to-text tool that types into text fields
