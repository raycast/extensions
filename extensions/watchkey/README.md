# Watchkey for Raycast

Raycast extension for [watchkey](https://github.com/Etheirystech/watchkey) — store and retrieve macOS Keychain secrets with Touch ID & Apple Watch.

## Prerequisites

Install [watchkey](https://github.com/Etheirystech/watchkey):

```bash
git clone https://github.com/Etheirystech/watchkey.git
cd watchkey
sudo make install
```

## Commands

| Command | Description |
|---------|-------------|
| **Set Key** | Store a secret via a secure password field |
| **Get Key** | Retrieve a secret and copy to clipboard |
| **Delete Key** | Delete a secret (with confirmation) |
| **Import Key** | Import an existing keychain item into watchkey |

All commands trigger Touch ID / Apple Watch authentication via watchkey.

## Install

```bash
git clone https://github.com/Etheirystech/raycast-watchkey.git
cd raycast-watchkey
npm install
npm run dev
```

Press `Ctrl+C` to stop dev mode — the extension stays installed in Raycast.
