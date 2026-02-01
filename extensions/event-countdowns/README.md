# Event Countdowns

Track countdowns to important events like birthdays, anniversaries, and more. This extension helps you stay on top of upcoming occasions with a clean, simple interface.

## Features

- **Event List**: View all your events sorted by days remaining
- **Countdown Display**: See exactly how many days until each event (today = 0)
- **Repeat Types**: Support for one-time, yearly, and monthly recurring events
- **Auto-Archive**: Past one-time events are automatically archived
- **Quick Actions**: Add, edit, archive, and delete events with keyboard shortcuts

## Commands

### View Events

The main command that displays all your active events sorted by days remaining. Each event shows:

- Event title
- Next occurrence date
- Days remaining
- Repeat type (One-time, Yearly, Monthly)

### Add Event

Create a new countdown event with:

- **Title**: Name of the event (e.g., "Mom's Birthday")
- **Date**: The event date
- **Repeat**: Choose between One-time, Yearly, or Monthly

### View Archived Events

Browse past one-time events that have been archived. You can permanently delete events from this view.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ N` | Add new event |
| `Enter` | Edit selected event |
| `⌘ E` | Archive event |
| `⌘ ⇧ A` | View archived events |
| `⌘ ⌫` | Delete event |

## Repeat Rules

### One-time

Events occur only once on the specified date. After the date passes, the event is automatically moved to the archive.

### Yearly

Events repeat on the same month and day each year. Perfect for birthdays and anniversaries.

### Monthly

Events repeat on the same day each month. Useful for recurring payments, meetings, etc.

## Data Storage

All events are stored locally using Raycast's LocalStorage API. No data is sent to external servers.
