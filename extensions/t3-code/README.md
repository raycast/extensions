# T3 Code

Control T3 Code agents from Raycast.

## Features

- Browse T3 Code projects and threads
- Start a new agent thread from Raycast
- Send follow-up messages to existing threads
- Stop running agents
- Archive threads
- Open projects and threads in T3 Code web
- View compact thread status with full error details when needed

## Setup

1. Open T3 Code.
2. Create a pairing link or pairing code from the T3 Code connections settings.
3. In Raycast, run `Setup Device`.
4. Paste the full pairing URL, or a URL containing `#token=...`.
5. Use the `T3 Code Agents` command to browse projects and control agents.

The extension exchanges the one-time pairing token for an access token and does not store the original pairing token.

## Notes

T3 Code must be running and reachable from this machine. Local network, HTTPS, and Tailscale/MagicDNS URLs are supported when your T3 Code server exposes them.
