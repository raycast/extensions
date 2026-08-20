# OpenClaw Changelog

## [Remote gateway / nodes] - 2026-08-20

- Read `gateway.remote.token` / `gateway.remote.url` from `~/.openclaw/openclaw.json` when Raycast prefs still have an empty token or the localhost default
- Token preference is no longer required so node Macs are not blocked on the first-run password field
- Clearer errors for connection refused, 401, and 404/405 (`chatCompletions` disabled)
- Docs: do not start a local gateway on node-only Macs; Tailscale HTTPS is the remote path

## [Initial Release] - 2026-02-23

- Added "Ask OpenClaw" command for quick Q&A
- Added "Chat with OpenClaw" command with persistent conversations
- Added "Ask About Clipboard" command for clipboard analysis
- Added "Process Selected Text" command with 10 text actions
- Streaming response support
- Local conversation history storage
