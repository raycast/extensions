# Pterodactyl Manager for Raycast

Control your Pterodactyl servers directly from Raycast. Manage power states, send commands via console, and monitor resources in real-time.

## Features

- **Server List**: View all your servers with their current status (Running, Offline, Starting, etc.).
- **Power Actions**: Start, Stop, Restart, and Kill servers.
  - **Safety First**: Confirmation dialogs for all power actions to prevent accidents.
  - **Smart Actions**: "Start" is only visible when offline, "Stop/Restart" only when running.
- **Interactive Console**:
  - Live log streaming via WebSocket.
  - Send commands directly to your server.
  - Historical logs fetched upon connection.
- **Real-time Monitoring**:
  - **Live Dashboard**: View CPU, RAM, Disk, and Network usage.
  - **ASCII Charts**: Visual graphs for CPU, RAM, and Network (Upload/Download) history directly in Raycast.
  - **Network Speed**: Displays real-time bandwith (KB/s) instead of cumulative usage.

## Setup

1. **Install Extension**: Clone this repo and run `npm install && npm run build`.
2. **Configure**:
   - **Panel URL**: The URL of your Pterodactyl panel (e.g., `https://panel.example.com`).
   - **API Key**: Create a "Client API Key" in your Pterodactyl Account Settings.

## Usage

- **Enter**: Opens the Console (Safe default).
- **Cmd + M**: Opens the Monitoring view.
- **Cmd + O**: Opens the server in your browser.
- **Ctrl + K**: Kills the server (Requires confirmation).

## Technical Details

- Built with React, TypeScript, and the Raycast API.
- Uses WebSockets for real-time console and stats.
- Implements `asciichart` for terminal-like graphs within the Raycast UI.
- Securely stores API keys in Raycast's encrypted preferences.

## License

MIT
