# Raycast Alarms Extension

Create system-wide alarms that work even when Raycast is closed. Perfect for meetings, breaks, or important tasks with rich notifications and sound alerts.

## Features

- System-wide alarms (works when Raycast is closed)
- Zero external dependencies - uses only macOS built-in tools
- Custom popup interface with stop options
- Sound alerts that repeat until dismissed
- Centralized alarm management
- Automatic timeout after 10 minutes

## How It Works

This extension leverages macOS's crontab system to schedule alarms that trigger regardless of Raycast's running state. When an alarm fires:

1. Your chosen sound plays on repeat
2. A custom popup displays the alarm title
3. The alarm auto-stops after 10 minutes if not dismissed

Each alarm is scheduled with a specific date and time (not just hour and minute) to ensure it only triggers once at the intended moment. When the dialog appears, it automatically removes the crontab entry to prevent the alarm from repeating unintentionally.

### Technical Implementation

The extension uses a highly optimized architecture:

- Alarms are scheduled in system crontab for maximum reliability
- Alarm data is stored in efficient pipe-delimited text files
- Native macOS commands handle all operations with zero dependencies
- Dialog appearance automatically removes the triggering crontab entry
- Leading zeros in time display ensure consistent formatting

## Installation

1. Install from the Raycast store
2. The extension automatically sets up necessary directories and scripts
3. No additional dependencies required

## Usage

### Creating Alarms

1. Open Raycast and search for "Create Alarm"
2. Set date, time, title (optional), and sound
3. Click "Create Alarm" in the action panel

### Managing Alarms

1. Open Raycast and search for "My Alarms"
2. View, remove, or create alarms from the list interface

### Stopping Alarms

- Click "Stop" on the popup when an alarm triggers
- Use "Stop All Alarms" action from "My Alarms" to silence everything at once

## Technical Details

Built using only native macOS technologies:

- crontab for scheduling
- Shell scripts for trigger management
- AppleScript for UI dialogs
- `afplay` for sound playback
- Pipe-delimited text files for efficient data storage

## Testing

The extension includes a comprehensive test suite to ensure reliability:

```bash
# Run all tests
./tests/run-tests.sh

# Run specific test suites individually
./tests/integration/alarms-test.sh
./tests/integration/trigger-test.sh
```

These integration tests verify:
- Alarm creation and storage
- Time formatting with leading zeros
- Alarm listing functionality
- Alarm removal
- Multiple alarm management
- Alarm triggering and cleanup

For running the JSON validation tests, you'll need to have `jq` installed:
```bash
brew install jq
```

## Requirements

- macOS 10.15+
- Raycast 1.40.0+

## Troubleshooting

If alarms don't trigger:

1. Ensure your Mac isn't sleeping at the scheduled time
2. Check notification permissions for script applications
3. Verify the extension has necessary system permissions

## Privacy

- Completely local scheduling - no external servers
- Data stored only in `~/.raycast-alarms` directory
- Zero external dependencies or data sharing

## Credits

Created by ocodista