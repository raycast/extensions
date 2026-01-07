# Water Reminder for Raycast

Stay hydrated with smart reminders and track your daily water intake with seamless Apple Shortcuts integration.

## Features

### 💧 Log Water Intake
- Quick form to log water consumption
- Customizable default amounts
- Optional notes for each entry
- Real-time progress tracking

### 📊 View History & Stats
- Beautiful list view of today's water intake
- Progress indicators with dynamic colors
- Percentage completion of daily goal
- Delete individual logs
- Celebratory messages when you reach your goal 🎉

### ⏰ Smart Reminders
- Background reminder service
- Customizable reminder intervals
- Context-aware messages based on your progress
- HUD notifications that don't interrupt your workflow

### 🔗 Apple Shortcuts Integration
- Automatically sync water logs to Apple Shortcuts
- Receive structured JSON data in your shortcuts
- Build custom automations (Health app sync, notifications, charts, etc.)

## Installation

1. Navigate to the extension directory:
```bash
cd water-reminder
npm install
npm run dev
```

2. The extension will open in Raycast development mode

3. Configure your preferences in Raycast settings

## Configuration

Open Raycast → Settings → Extensions → Water Reminder to configure:

- **Daily Water Goal (ml)**: Your target daily water intake (default: 2000ml)
- **Default Amount (ml)**: Quick-fill amount for logging (default: 250ml)
- **Reminder Interval (minutes)**: How often to show reminders (default: 60 minutes)
- **Apple Shortcut Name**: Name of your Apple Shortcut to trigger (optional)
- **Enable Notifications**: Toggle reminder notifications on/off

## Apple Shortcuts Setup

### Creating a Shortcut to Receive Water Logs

1. Open **Shortcuts** app on macOS
2. Create a new shortcut with these actions:
   ```
   - Receive [Dictionary] input from Sharing
   - Get value for "amount" in [input]
   - Get value for "totalToday" in [input]
   - Get value for "timestamp" in [input]
   - Log Health Sample (Water) - [amount] ml
   ```
3. Name your shortcut (e.g., "Log Water to Health")
4. Copy the exact name to Water Reminder preferences

### Shortcut Data Format

Your shortcut will receive this JSON structure:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "amount": 250,
  "note": "Morning glass",
  "totalToday": 1500,
  "goal": 2000
}
```

### Example Use Cases

**Sync to Apple Health:**
```
Receive input → Log Health Sample (Water) → amount ml
```

**Send notification when goal reached:**
```
Receive input → If totalToday ≥ goal → Show Notification "🎉 Daily goal reached!"
```

**Create daily log in Notes:**
```
Receive input → Append to Note "Water Log [today's date]"
```

**Track in Google Sheets:**
```
Receive input → Add row to Google Sheet (via Make.com/Zapier)
```

## Commands

### Log Water
**Command:** `Log Water`
- Opens a form to record water intake
- Enter amount in milliliters
- Add optional notes
- Automatically syncs to Apple Shortcuts

### Water History
**Command:** `Water History`
- View all logs for today
- See progress toward daily goal
- Delete individual entries
- Real-time statistics

### Water Reminder (Background)
**Command:** `Water Reminder (Background)`
- Manually trigger a reminder check
- Shows time until next reminder
- Displays current progress

**Tip:** Set up a Raycast hotkey or alias for quick access to logging!

## Tips & Tricks

1. **Quick Logging**: Create a Raycast hotkey for "Log Water" to instantly log your default amount
2. **Recurring Reminders**: Use Raycast's scheduled commands feature to auto-run the reminder
3. **Health Integration**: Use Apple Shortcuts to sync all logs to Apple Health automatically
4. **Custom Goals**: Adjust your daily goal based on activity level, weather, or personal needs
5. **Tracking Patterns**: Check your history to identify hydration patterns throughout the day

## Data Storage

Water logs are stored locally in:
```
~/Library/Application Support/com.raycast.macos/extensions/water-reminder/water-logs/
```

Each day's data is saved in a separate JSON file (`YYYY-MM-DD.json`)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Auto-fix linting issues
npm run fix-lint
```

## Requirements

- macOS 12.0+
- Raycast 1.50.0+
- Node.js 20+
- Apple Shortcuts (optional, for integrations)

## Icon

**Note:** Please add a 512x512 PNG icon of a water droplet to `assets/icon.png`

You can use:
- SF Symbols: "drop.fill"
- Free icons from [Noun Project](https://thenounproject.com/)
- Create custom icon with design tools

## License

MIT

## Feedback & Contributions

Found a bug or have a feature request? Feel free to open an issue or submit a pull request!

---

**Stay hydrated! 💧**
