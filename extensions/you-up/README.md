# You Up?

You Up? is an uptime monitoring service that checks your websites, APIs, servers and cron jobs from several locations and alerts you by email, Slack, WhatsApp, SMS and more, only when an outage is confirmed.

This Raycast extension connects to the [You Up? HTTP API](https://docs.uup.dev/api/) (`https://api.uup.dev/v1`). Requires a [You Up?](https://uup.dev/) account and API token. It includes zero third-party analytics SDKs.

## Features

- **Menu Bar Status**: Live macOS menu bar indicator for open Incidents, degraded Monitors, and Regional outages across every Project your token reaches.
- **Monitors**: Browse and filter HTTP, TCP, Ping, and Heartbeat Monitors, read 24h / 7d / 30d / 90d uptime figures and recent probe runs, Snooze alerts, Pause or Resume a Monitor, and Acknowledge open Incidents.
- **Incidents**: Inspect open and resolved Incidents, read plain-language outage evidence showing where the connection stopped across locations, and Acknowledge, Snooze, or Resolve with one keystroke.
- **Raycast AI Tools**: Ask `@you-up` in Raycast AI whether everything is up, list Monitors and Incidents, or Acknowledge and Snooze with confirmation.

## Setup

1. Sign in to [You Up?](https://app.uup.dev/) and open **Organization Settings -> API Tokens**.
2. Create an API token (`uup_api_...`):
   - Choose **Read-only** if you only want to read status, Monitors, uptime, and Incidents.
   - Choose **Full** if you also want to Acknowledge or Resolve Incidents, Snooze Checks, and Pause or Resume Monitors.
3. Paste the token into the **API Token** preference when Raycast prompts you.

## Links

- [Website](https://uup.dev/)
- [Documentation](https://docs.uup.dev/)
- [HTTP API reference](https://docs.uup.dev/api/)
- [AI assistants (MCP)](https://docs.uup.dev/api/mcp/)
