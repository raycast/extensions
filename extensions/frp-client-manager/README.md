# frp Client Manager

Manage a local [frp](https://github.com/fatedier/frp) client (frpc) on macOS from Raycast.

## Features

- **View Status** — process state, PID, uptime, frpc version, admin API connectivity, and proxy counts. Start / stop / restart the launchd-managed service.
- **Manage Proxies** — lists every proxy from `frpc.toml` with its live status from the frpc admin API. Copy the remote address or a ready-to-use SSH command.
- **View Logs** — tail the frpc log with error / warning / info filters.
- **Edit Config** — view `frpc.toml`, verify it with `frpc verify`, and hot-reload it through the admin API without dropping connections.
- **frp Menu Bar** — always-on menu bar item with proxy status, service control, and update checks.
- **Updates** — detects new [frp releases](https://github.com/fatedier/frp/releases) and can upgrade the local frpc binary in one step (old versions are kept, the LaunchAgent plist is backed up, and the service is restarted).

## Setup

### 1. Point the extension at your frp directory

Set the **frp Directory** preference to the folder that contains your `frpc.toml` and one or more `frp_<version>_<platform>` binary directories:

```
frp/
├── frpc.toml
├── frpc.log
└── frp_0.71.0_darwin_arm64/
    └── frpc
```

### 2. (Recommended) Enable the frpc admin API

Add a `webServer` section to `frpc.toml` and restart frpc:

```toml
webServer.addr = "127.0.0.1"
webServer.port = 7400
webServer.user = "admin"
webServer.password = "choose-a-strong-password"
```

Then fill in **Admin API Address**, **Admin Username**, and **Admin Password** in the extension preferences. Without this, the extension still works, but proxy status comes only from the config file and hot-reload is unavailable.

### 3. (Optional) Service control via launchd

If frpc is managed by a LaunchAgent, set the **launchd Label** preference (e.g. `com.user.frpc`, matching `~/Library/LaunchAgents/<label>.plist`). This enables Start / Stop / Restart actions and plist-aware upgrades.

Example plist:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.user.frpc</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/frp/frp_0.71.0_darwin_arm64/frpc</string>
        <string>-c</string>
        <string>/path/to/frp/frpc.toml</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/frp/frp_0.71.0_darwin_arm64</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load it with `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.user.frpc.plist`.

If no label is configured, the extension shows process status (via `pgrep`) and one-click upgrades only download the new binary without touching any service.

## Requirements

- macOS (Apple Silicon or Intel)
- A local frp client (`frpc`) installed from the [frp releases page](https://github.com/fatedier/frp/releases)

## Logo

The frp logo is provided by [Dashboard Icons](https://dashboardicons.com/icons/frp).
