# TailServe

Start and manage an OpenCode server published to your Tailscale tailnet from Raycast.

## What It Does

- Starts `opencode serve` in a dedicated tmux session.
- Binds OpenCode to localhost (`127.0.0.1`) for local safety.
- Publishes the local server over your Tailscale tailnet using `tailscale serve`.
- Lets you stop the service and check status directly from Raycast.
- Copies the active URL to your clipboard when available.

## Prerequisites

- [Tailscale](https://tailscale.com/download) installed and connected (`tailscale up`)
- [OpenCode](https://opencode.ai) CLI installed and available as `opencode`
- `tmux` installed (`brew install tmux`)

## Installation

### From Raycast Store

1. Open Raycast.
2. Search for `TailServe`.
3. Install the extension.

### From Source

```bash
git clone https://github.com/leeweisern/tailserve.git
cd tailserve
npm install
npm run dev
```

Then import/load the extension in Raycast developer mode.

## Commands

- **Start Server**: Starts OpenCode and publishes it via Tailscale.
- **Stop Server**: Stops the tmux session and removes the Tailscale listener.
- **Server Status**: Checks health and copies the current URL when running.

## Preferences

- **Port**: OpenCode server port (default: `4096`).
- **Password**: Optional password passed as `OPENCODE_SERVER_PASSWORD`.

## How It Works

1. TailServe validates dependencies (`tailscale`, `opencode`, `tmux`) and the configured port.
2. It starts OpenCode in a unique tmux session (`tailserve-<port>`).
3. It waits for `http://127.0.0.1:<port>/global/health` to report healthy.
4. It runs `tailscale serve --bg --yes --https <port> http://127.0.0.1:<port>`.
5. It resolves your tailnet DNS name and copies the resulting URL.

## Security Notes

- OpenCode is bound to localhost, not all interfaces.
- Access is through your Tailscale tailnet only.
- You can optionally protect access with `OPENCODE_SERVER_PASSWORD`.

Inspired by [tailcode](https://github.com/kitlangton/tailcode).

## License

MIT
