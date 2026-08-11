# Paste Safely

Raycast extension for safer pasting.

It adds context-aware confirmation before pasting, based on the frontmost app and (when available) active browser website.

## Policy Modes

- `allow` mode: confirm paste for targets **not** in allow list.
- `block` mode: confirm paste for targets **in** block list.

Targets are normalized to lowercase:

- apps: bundle IDs (e.g. `com.apple.Terminal`)
- websites: hostnames (e.g. `github.com`)

## Website Detection

If Raycast Browser Extension access is available, the active tab hostname is used.
If unavailable, the policy falls back to app-only context.

## Configuration

The `Configure` command has actions to open the config file/folder directly.
