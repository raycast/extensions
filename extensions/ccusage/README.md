# Claude Code Usage (ccusage)

<div align="center">
  <img src="https://github.com/user-attachments/assets/4ae63a5c-3064-4050-8077-45b508dcc4ff" alt="Claude Code Usage Icon" width="128" height="128">
  
  A Raycast extension that provides real-time monitoring of Claude Code usage statistics using the [ccusage](https://github.com/ryoppippi/ccusage) CLI tool.
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Raycast Extension](https://img.shields.io/badge/Raycast-Extension-red.svg)](https://raycast.com/)
</div>

## Features

Monitor your Claude Code usage with comprehensive real-time statistics:

- **Today Usage**: Track input/output tokens and costs for today with visual intensity indicators
- **Session History**: View recent usage sessions with model-specific breakdown and icons
- **Cost Analysis**: Detailed cost tracking with monthly projections and spending insights
- **Model Statistics**: Usage analytics by Claude model (Opus, Sonnet, Haiku) with tier grouping
- **Menu Bar Integration**: Quick access to usage stats directly from your system menu bar
- **Default View Preference**: Choose which section to display first when opening the extension
- **Custom npx Path**: Support for custom npx installations and non-standard Node.js setups

## Screenshots

### Main Usage View

![Claude Code Usage](metadata/ccusage-2.png)

## Requirements

This extension requires the [ccusage](https://github.com/ryoppippi/ccusage) CLI tool to function properly. The extension automatically installs and runs ccusage using **npx** (Node Package Execute).

### System Requirements

- **Node.js** with npm/npx installed
- **Claude Code** usage history (the extension reads local ccusage data)
- **Internet connection** for downloading ccusage when first run

## Setup

1. Install the extension from the Raycast Store
2. Open the extension - it will automatically download ccusage using npx
3. The extension will immediately start displaying your Claude Code usage data

### Configuration (Optional)

- **Default View**: Set which section appears first (Today Usage, Session History, Cost Analysis, or Model Breakdown)
- **Custom npx Path**: If npx is installed in a non-standard location, specify the full path to npx

Access preferences with **Cmd+Shift+,** when the extension is open.

## Important Notes

- **Unofficial Extension**: This extension is not an official product of Anthropic or the ccusage developers
- **Data Privacy**: All usage data is processed locally using the ccusage CLI tool
- **Performance**: The extension uses optimized refresh intervals to balance real-time updates with system performance

## Support

If you encounter any issues or have suggestions, please [create an issue](https://github.com/raycast/extensions/issues) in the repository.

## Credits

The Raycast layout of this extension was inspired by the [System Monitor](https://www.raycast.com/hossammourad/raycast-system-monitor) extension.

Special thanks to [@ryoppippi](https://github.com/ryoppippi) for creating the [ccusage](https://github.com/ryoppippi/ccusage) tool that makes this extension possible.

## License

MIT
