# Water Reminder

Stay hydrated from Raycast with quick logging, daily progress, menu bar tracking, and scheduled reminders.

## Features

- Log water intake with a default amount and optional note.
- View recent hydration history with daily and weekly progress.
- Delete individual logs when you need to correct an entry.
- Track today's progress from the menu bar and quick-log your default amount.
- Snooze or resume reminders from the menu bar.
- Optionally sync each log to a webhook, Habitify, or NocoDB.

## Preferences

- **Daily Water Goal**: Target daily intake in milliliters.
- **Default Amount**: Amount used for quick logging.
- **Reminder Interval**: How often the background reminder can show a HUD.
- **Webhook URL**: Optional endpoint that receives water log payloads.
- **Habitify API Key / Habit ID**: Optional Habitify sync settings.
- **NocoDB Base URL / API Token / Table ID**: Optional NocoDB sync settings.

## Commands

- **Log Water**: Record a custom water intake entry.
- **Water History**: Review recent logs and progress.
- **Water Tracker**: Menu bar tracker with quick logging and reminder controls.
- **Water Reminder**: Background reminder command for scheduled runs.

## Data Storage

Water logs are stored locally in Raycast's extension support directory.
