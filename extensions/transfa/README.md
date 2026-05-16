# Transfa

Upload any file to [transfa](https://transfa.sh) and get a shareable link in your clipboard — without leaving the keyboard.

## Commands

### Upload File

Pick a file, set an expiry, and optionally password-protect the link. Hit enter — the link is copied to your clipboard instantly.

- **File picker** — any format, any size (up to your plan limit)
- **Expiry** — 1h, 24h, 7 days, or 30 days
- **Password** — optional, protects the download link
- **Guest mode** — no account required (10 MB / 24h TTL)

### Recent Uploads

Browse your recent uploads, copy links, and delete files you no longer need. Requires an API key (free at transfa.sh).

## Setup

No account needed — install the extension and start uploading immediately in guest mode.

For larger files and longer TTLs, add a free API key in **Raycast Preferences → Extensions → Transfa → API Key**.

## About Transfa

Transfa is ephemeral file transfer for developers and AI agents — upload with one command, share with a link, no infrastructure required.

- CLI: `npm install -g transfa`
- Python SDK: `pip install transfa`
- MCP server: `npx -y transfa-mcp` (Claude, Cursor, any MCP agent)
- GitHub Action: `colapsis/transfa-action@v1`
