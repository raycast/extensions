# Standing Desk Tracker

Track your standing and sitting time throughout the day to maintain a healthy work routine.

## Features

- **Real-time Tracking**: Track your standing and sitting sessions in real-time
- **Menubar Integration**: Quick access to your current status and daily stats from the menubar
- **Statistics Dashboard**: View detailed statistics for today, this week, or this month
- **Smart Notifications**: Get motivated with notifications when you've been sitting too long or need to reach your daily standing goal
- **Quick Toggle**: Easily switch between standing and sitting states with a single command
- **Session History**: All your sessions are automatically saved and tracked

## Commands

### Standing Desk Tracker
Main command to view and manage your standing/sitting state. Shows current status, elapsed time, and today's statistics.

### Standing Desk (Menubar)
Displays your current status in the menubar with quick access to:
- Current state (Standing/Sitting) and elapsed time
- Today's statistics (standing, sitting, total time)
- Quick toggle to switch states

### Toggle Standing/Sitting
Quick command to toggle between standing and sitting states without opening a view.

### Standing Desk Stats
View detailed statistics including:
- Total time, standing time, and sitting time
- Visual breakdown with progress bars
- Session statistics (count, average duration, longest/shortest sessions)
- Filter by day, week, or month

## Preferences

The menubar command includes the following configurable preferences:

- **Sitting Warning (minutes)**: Show notification if sitting for more than this many minutes (default: 45)
- **Daily Standing Goal (hours)**: Target hours of standing per day (default: 3)
- **Notification Cooldown (minutes)**: Minimum minutes between notifications (default: 10)

## Usage

1. **Start Tracking**: Open the "Standing Desk Tracker" command and select your current position (Standing or Sitting)
2. **Switch States**: Use the toggle action or the "Toggle Standing/Sitting" command when you change positions
3. **View Stats**: Open "Standing Desk Stats" to see detailed statistics for different time periods
4. **Menubar Access**: The menubar command updates every 10 seconds and provides quick access to your status

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Open Raycast and import the extension

## Development

```bash
# Run in development mode
npm run dev

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

## License

MIT

