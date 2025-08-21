# Wispr Flow

Control Wispr Flow voice transcription app: view statistics, switch microphones, and launch the application.

## Features

- **My Stats Menu Bar**: Automatically shows word count and WPM in your menu bar with quick microphone switching (when enabled in preferences)
- **View Statistics**: See detailed transcription statistics in a dedicated view
- **Switch Microphone**: Easily change the microphone used by Wispr Flow
- **Launch App**: Quick way to open the Wispr Flow application

## Requirements

- [Wispr Flow](https://wisprflow.ai/) must be installed
- macOS with audio input devices
- Wispr Flow must have been used at least once to generate statistics

## Setup

No additional configuration required. The extension automatically:

- Reads statistics from your Wispr Flow database
- Detects available audio input devices
- Updates Wispr Flow's microphone settings

**Optional:** Enable or disable the menu bar display via Raycast → Extensions → Wispr Flow → Preferences → "Show Menu Bar Stats"

## Commands

### My Stats Menu Bar
When enabled via preferences, automatically shows your transcription statistics in the menu bar and provides quick access to microphone switching. Updates automatically every 60 minutes.

### View Statistics
Displays detailed statistics including:
- Total words transcribed
- Average words per minute
- Real-time data from your Wispr Flow usage

### Switch Microphone
Lists all available audio input devices and allows you to:
- See which microphone is currently selected
- Switch to any available microphone
- Automatically restart Wispr Flow to apply changes

### Launch Wispr Flow
Quickly opens the Wispr Flow application.

## Troubleshooting

**"Wispr Flow database not found"**
- Ensure Wispr Flow is installed
- Use Wispr Flow at least once to create the database

**"No microphones detected"**
- Check system audio permissions
- Verify audio input devices are connected

**Microphone changes not taking effect**
- The extension automatically restarts Wispr Flow
- If issues persist, manually restart Wispr Flow

## Privacy

This extension only reads local data from your Wispr Flow installation. No data is transmitted externally.
