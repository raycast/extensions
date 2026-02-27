# Clash Verge

Raycast extension for controlling Clash Verge on macOS.

## Commands

- `Network`: explicitly enable/disable `System Proxy` and `TUN Mode`.
- `Proxy Mode`: explicitly set mode to `rule`, `global`, or `direct`.

## Requirements

- macOS
- Clash Verge running
- Mihomo UNIX socket reachable at `/tmp/verge/verge-mihomo.sock` (or your configured path)

## Note

- Using this extension can change Clash Verge runtime state directly, so runtime state and GUI state may become temporarily out of sync.

## Preferences

- `socketPath`: Mihomo UNIX socket path
- `proxyHost`: host used when enabling macOS system proxy
- `vergeConfigPath`: optional custom path to `verge.yaml` for GUI-state comparison
