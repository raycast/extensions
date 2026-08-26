# PushToDisplay for Raycast

Send real-time updates to your [PushToDisplay](https://pushtodisplay.com) boards. Any display
running the PushToDisplay app — a TV wall, dashboard, or phone — updates instantly.

## Features

- **Send Update** — compose a styled update: message text, target board, panel (1–4 for
  multi-panel layouts), spacing, full-panel mode, and per-block text size, weight, and colors.
- **Quick Send** — type a message and hit Enter; it goes straight to a board with defaults.
- **Sign in with OAuth2** — no API keys to manage; tokens are stored in the macOS Keychain
  and refreshed automatically.

## Setup

1. Run **Send Update** and sign in with your PushToDisplay account when prompted.
2. Optional: set **Default Board ID** and **Default Panel** in the extension preferences to
  control where **Quick Send** delivers updates (leave unset to use the API defaults:
  your account's default board / panel).
3. Find the **Board ID** in the PushToDisplay app or web portal.

## Commands

### Send Update

Fill in the message, pick a board (or keep "Default board"), and configure the styling. Press
`⌘⏎` to send — your display updates in seconds.

### Quick Send

`⌘ Space` → "Quick Send" → `Turn off the AC at 5pm` → Enter.

## License

[MIT](LICENSE)
