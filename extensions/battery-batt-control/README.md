# Battery Batt Control

This extension is inspired by [Battery Optimizer](https://www.raycast.com/Qetesh/battery-optimizer). However, instead of using `bclm` (which is currently incompatible with macOS 15+ due to the removal or alteration of the `CHWA` SMC key, which it relied upon to set battery charge limits), it uses the [batt CLI](https://github.com/charlie0129/batt) to control battery optimization on macOS.

## Features

- View battery status and health information
- Set battery charge limits to extend battery lifespan
- Enable/disable battery optimization features
- Works with administrator privileges when needed

## Requirements

- macOS 15 or later
- [Raycast](https://raycast.com/) installed
- [batt CLI](https://github.com/charlie0129/batt) installed

## Installation

1. Install the extension from the Raycast store
2. Install the batt CLI using Homebrew:

   ```bash
   brew install batt
   ```

3. Grant necessary permissions when prompted

## Configuration

The extension includes a preference setting that allows you to specify a custom path to the batt CLI executable:

1. Open Raycast
2. Go to Extensions > Battery Batt Control > Preferences
3. Enter the full path to your batt CLI executable in the "Custom Batt CLI Path" field
   - Example: `/opt/homebrew/bin/batt` or `/usr/local/bin/batt`

![settings](</media/battery-batt-control-1.png>)

This is useful if:

- The batt CLI is installed in a non-standard location
- You have multiple versions of batt installed
- The automatic path detection fails to find your batt installation

## Usage

The extension provides several commands to manage your battery:

- **Get Battery Status**: View current battery information

![Battery Status Overview](</media/battery-batt-control-2.png>)

![Battery Status Example](</media/battery-batt-control-3.png>)

- **Set Battery Limit**: Set a maximum charge percentage (0-100%)

![Battery Charge Limit Interface](</media/battery-batt-control-4.png>)

- **Disable Battery Optimization**: Turn off battery optimization features

## Technical Details

### Dependencies

- **batt CLI**: The core utility that provides battery management capabilities
- **osascript**: A built-in macOS tool used to execute commands with administrator privileges when needed

### Implementation Notes

The extension uses multiple approaches to ensure reliable command execution:

1. Direct command execution using Node.js child_process
2. Fallback to osascript for commands requiring administrator privileges
3. Final fallback to direct shell invocation as a last resort

This multi-layered approach ensures maximum compatibility across different macOS environments.

## Troubleshooting

If you encounter issues:

1. Ensure batt CLI is properly installed and accessible in your PATH
2. Check that you've granted necessary permissions
3. Try restarting Raycast
4. If the extension can't find your batt CLI, specify the custom path in the extension preferences.
