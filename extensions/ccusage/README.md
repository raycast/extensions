# Claude Code Usage (ccusage)

<div align="center">
  <img src="assets/extension-icon.png" alt="Claude Code Usage Icon" width="128" height="128">
  
  A Raycast extension that provides real-time monitoring of Claude Code usage statistics using the [ccusage](https://github.com/ryoppippi/ccusage) CLI tool.
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Raycast Extension](https://img.shields.io/badge/Raycast-Extension-red.svg)](https://raycast.com/)
</div>

## Features

Monitor your Claude Code usage with comprehensive real-time statistics:

- **Daily Usage**: Track input/output tokens and costs for today with visual intensity indicators
- **Session History**: View recent usage sessions with model-specific breakdown and icons
- **Cost Analysis**: Detailed cost tracking with monthly projections and spending insights
- **Model Statistics**: Usage analytics by Claude model (Opus, Sonnet, Haiku) with tier grouping
- **Menu Bar Integration**: Quick access to usage stats directly from your system menu bar
- **Runtime Flexibility**: Support for multiple JavaScript runtimes (npx, bunx, pnpm, deno)
- **Timezone Support**: Customizable timezone settings for accurate date display

## Screenshots

### Main Usage View

![Claude Code Usage](metadata/ccusage-2.png)

## Requirements

This extension requires the [ccusage](https://github.com/ryoppippi/ccusage) CLI tool to function properly. The extension will automatically attempt to install and run ccusage using your preferred JavaScript runtime.

### Supported Runtimes

- **npx** (Node Package Execute) - Default
- **bunx** (Bun Package Execute)
- **pnpm dlx** (PNPM Package Execute)
- **deno run** (Deno Runtime)

## Setup

1. Install the extension from the Raycast Store
2. Open the extension - it will guide you through the initial setup
3. Configure your preferred JavaScript runtime in preferences if needed
4. The extension will automatically fetch your Claude Code usage data

## Important Notes

- **Unofficial Extension**: This extension is not an official product of Anthropic or the ccusage developers
- **Data Privacy**: All usage data is processed locally using the ccusage CLI tool
- **Performance**: The extension uses optimized refresh intervals to balance real-time updates with system performance

## Support

If you encounter any issues or have suggestions, please [create an issue](https://github.com/nyatinte/raycast-ccusage/issues) in the repository.

## Credits

The Raycast layout of this extension was inspired by the [System Monitor](https://www.raycast.com/hossammourad/raycast-system-monitor) extension.

Special thanks to [@ryoppippi](https://github.com/ryoppippi) for creating the [ccusage](https://github.com/ryoppippi/ccusage) tool that makes this extension possible.

## License

MIT
