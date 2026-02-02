# OpenClaw Center

Control your [OpenClaw](https://github.com/anthropics/openclaw) bot from Raycast. Chat with your AI assistant, monitor system status, manage skills, and view scheduled tasks.

## Features

- **Chat** - Send messages to your OpenClaw bot and receive streaming responses
- **Status** - View gateway health, channel connections, and device identity
- **Skills** - Browse installed skills, check requirements, enable/disable skills
- **Cron Jobs** - Monitor scheduled tasks, view run history, trigger jobs manually

## Setup

### Prerequisites

You need a running OpenClaw instance. OpenClaw can run locally or on a remote server accessible via Tailscale.

### Configuration

1. Open Raycast and search for any OpenClaw command
2. Configure the extension preferences:

| Setting | Description |
|---------|-------------|
| **Connection Mode** | `Local` for localhost, `Remote` for Tailscale/Funnel |
| **Remote URL** | Gateway URL for remote mode (e.g., `https://my-mac.tailnet-name.ts.net`) |
| **Local Port** | Port for local mode (default: `18789`) |
| **Password** | Authentication password if your gateway requires one |

### Device Pairing

When connecting to a remote gateway for the first time, your device needs to be paired:

1. The extension generates a unique device identity (Ed25519 keypair)
2. Your device ID appears in the Status view
3. The gateway admin must approve the pairing request
4. Once approved, the extension connects automatically

## Commands

### Chat with OpenClaw

Send messages to your AI assistant. Type in the search bar and press Enter to send. Responses stream in real-time.

### OpenClaw Status

View system health including:
- Gateway connection status
- Channel statuses (WhatsApp, Telegram, Discord, etc.)
- Device identity information
- Debug logs for troubleshooting

### OpenClaw Skills

Manage your bot's capabilities:
- See all installed skills with status indicators
- Filter by Ready, Needs Setup, or Disabled
- Enable or disable skills
- View missing requirements (API keys, binaries, config)

### OpenClaw Cron Jobs

Monitor scheduled tasks:
- View all cron jobs with schedules
- See next run times and last run status
- Trigger jobs manually
- View run history

## Screenshots

<!-- Add screenshots here after taking them -->

## Troubleshooting

### Connection Failed

1. Verify OpenClaw is running
2. Check the URL/port in preferences
3. For remote mode, ensure Tailscale is connected
4. If using Funnel, verify the password is correct

### Device Not Paired

1. Open the Status command to see your Device ID
2. Ask the gateway admin to approve your device
3. Retry the connection

### Reset Device Identity

If you encounter signature errors, reset your device identity:
1. Open the Status command
2. Press `Cmd+Shift+R` to reset
3. Reconnect (you'll need to pair again)

## License

MIT
