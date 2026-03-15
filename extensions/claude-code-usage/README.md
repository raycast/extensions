# Claude Code Usage

<div align="center">
  <img src="assets/extension-icon.png" alt="Claude Code Usage Icon" width="128" height="128">

  A Raycast extension to monitor your Claude Code session and weekly usage limits at a glance.

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Raycast Extension](https://img.shields.io/badge/Raycast-Extension-red.svg)](https://raycast.com/)
</div>

## Features

Monitor your Claude Code usage with real-time statistics:

- **Real-time usage dashboard** — View your current session and weekly utilization with visual progress bars
- **Detail panel** — Toggle a side panel to see exact reset timestamps, token status, plan type, and rate limit tier
- **Menu bar integration** — Always-visible usage percentage in your menu bar with color-coded status indicators
- **Auto-refresh** — Menu bar updates every 5 minutes; manual refresh anytime with `Cmd+R`
- **Smart caching** — 2-minute response cache with exponential backoff to handle API rate limits gracefully


## Commands

| Command | Description | Mode |
|---------|-------------|------|
| View Claude Code Usage | Full usage dashboard with detail panels | List View |
| Claude Code Usage Menu Bar | Compact usage display in your menu bar | Menu Bar |

## Setup

No configuration needed — the extension automatically reads your Claude Code OAuth credentials.

1. Install [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) if you haven't already
2. Log in with `claude auth login`
3. Launch the extension from Raycast

## Important Notes

- **Unofficial Extension**: This extension is not an official product of Anthropic
- **Data Privacy**: All usage data is fetched directly from the Anthropic API using your local OAuth credentials — nothing is stored or sent elsewhere
- **Rate Limiting**: The usage API may occasionally return HTTP 429 errors. This is a [known upstream issue](https://github.com/anthropics/claude-code/issues/30930). The extension handles this automatically with retry logic and cached fallback data.

## Support

If you encounter any issues or have suggestions, please [create an issue](https://github.com/raycast/extensions/issues/new?title=%5BClaude+Code+Usage%5D+...&template=extension_bug_report.yml&labels=extension,bug&extension-url=https://www.raycast.com/jashanmaan28/claude-code-usage&body=%0A%3C!--%0APlease+update+the+title+above+to+concisely+describe+the+issue%0A--%3E%0A%0A%23%23%23+Extension%0A%0Ahttps://www.raycast.com/jashanmaan28/claude-code-usage%0A%0A%23%23%23+Description%0A%0A%3C!--%0APlease+provide+a+clear+and+concise+description+of+what+the+bug+is.+Include+screenshots+if+needed.+Please+test+using+the+latest+version+of+the+extension,+Raycast+and+API.%0A--%3E%0A%0A%23%23%23+Steps+To+Reproduce%0A%0A%3C!--%0AYour+bug+will+get+fixed+much+faster+if+the+extension+author+can+easily+reproduce+it.+Issues+without+reproduction+steps+may+be+immediately+closed+as+not+actionable.%0A--%3E%0A%0A1.+In+this+environment...%0A2.+With+this+config...%0A3.+Run+%27...%27%0A4.+See+error...%0A%0A%23%23%23+Current+Behavior%0A%0A%23%23%23+Expected+Behavior%0A%0A) in the Raycast Extensions repository.

## License

MIT
