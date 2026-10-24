# OpenClaw Changelog

## [Gateway-Native Control Center] - 2026-09-17

- Added a native Control Center for Gateway health, tasks, sessions, agents, nodes, channels, and usage
- Replaced the optional HTTP integration with OpenClaw's native Gateway WebSocket protocol
- Connected Raycast conversations to real OpenClaw sessions with streaming responses, session history, and owner-aware continuation
- Added persistent Ed25519 device identity, pairing guidance, and Gateway-scoped device tokens
- Added first-run connection choices for OpenClaw configuration, local, LAN, Tailscale, and Cloudflare Access
- Added Cloudflare Access browser sign-in through GitHub, Google, or another configured identity provider, plus service-token support
- Added password authentication, JSON5 configuration discovery, secure URL validation, and credential scoping by Gateway
- Rebuilt Gateway Status around the authenticated handshake, protocol and server versions, health, and presence
- Updated the extension to Raycast API 2

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
