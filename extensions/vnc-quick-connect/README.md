# VNC Quick Connect

Open VNC connections in RealVNC Viewer directly from Raycast with a host and port.

## Use

1. Search for `VNC Quick Connect` or `Open VNC Connection`.
2. Press Space or Tab.
3. Enter an address such as `192.168.1.10 5900`, then press Return.

The command launches RealVNC Viewer directly instead of using a URL scheme, so it skips the URL confirmation prompt.

Accepted address formats:

- `192.168.1.10 5900`
- `192.168.1.10:5900`
- `192.168.1.10`

Port input with a space is preferred. The command converts `192.168.1.10 5900` to RealVNC Viewer's `192.168.1.10::5900` format internally.

## Preferences

- `RealVNC Viewer Path`: path to the local RealVNC Viewer executable.
- `Prefer Unencrypted Connections`: ask RealVNC Viewer to prefer unencrypted connections when the server allows it.
- `Suppress Unencrypted Connection Warning`: hide RealVNC Viewer's unencrypted-connection warning. Use only on trusted networks.

Security-related preferences are off by default for public distribution.

## Development

```bash
npm install
npm run build
npm run dev -- --non-interactive
npm run publish
```
