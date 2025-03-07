# Raycast Alarms Extension

Create system-wide alarms with rich notifications and sound alerts. Perfect for meetings, breaks, or important tasks.

## Features

- System-wide alarms with reliable scheduling
- Zero external dependencies - uses only macOS built-in tools
- Custom popup interface with stop option
- Sound alerts that repeat until dismissed
- Centralized alarm management
- Automatic timeout after 10 minutes

## How It Works

This extension leverages macOS's crontab system to schedule alarms. When an alarm fires:

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

## Requirements

- macOS 10.15+
- Raycast 1.40.0+

## Privacy

- Completely local scheduling - no external servers
- Data stored only in `~/.raycast-alarms` directory
- Zero external dependencies or data sharing