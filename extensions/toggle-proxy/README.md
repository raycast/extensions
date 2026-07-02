# Toggle Proxy

Manage SOCKS proxy, Xray configs, and SSH tunnels on macOS directly from Raycast.

## Features

### Proxy Menu Bar

Toggle SOCKS proxy from the macOS menu bar:

- Select which Xray config to run
- See the currently active config
- Automatic session management via tmux

### Convert VLESS URL

Convert VLESS URLs to Xray JSON configurations:

- Automatic saving to your Xray directory
- Custom routing rules with support for additional countries, domains, and IPs

### Config Manager

Browse, edit, and delete Xray configuration files:

- View file details (size, modification date, content preview)
- Built-in editor for quick changes
- Open in external editor

### Tunnel Manager

Create and manage SSH tunnel connections.

### Subscription Manager

Manage VLESS subscription URLs and keep configs up to date.

## Prerequisites

This extension requires [tmux](https://github.com/tmux/tmux) and [Xray](https://github.com/XTLS/Xray-core) installed on your system.

```bash
brew install tmux
```

## Configuration

| Preference | Description | Default |
|---|---|---|
| SOCKS Host | Proxy host address | `127.0.0.1` |
| SOCKS Port | Proxy port number | `1080` |
| Xray Config Path | Directory with Xray binary and configs | `~/xray` |
| Default Config | Default configuration file name | `config.json` |

## Troubleshooting

### tmux not found

If the extension cannot find tmux, make sure it is in your PATH. You can create a symlink:

```bash
sudo ln -s $(which tmux) /usr/local/bin/tmux
```

### Proxy fails to start

1. Verify your config file exists and contains valid JSON
2. Ensure the configured port is not already in use
3. Try running Xray manually to check for errors
