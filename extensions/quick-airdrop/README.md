# Quick AirDrop

Trigger the macOS AirDrop sheet straight from Raycast.

## Commands

- **AirDrop Selected File** — Send whatever is selected in the frontmost Finder window.
- **AirDrop Clipboard** — Auto-detects what's on the clipboard and AirDrops it:
  - A copied file ➜ sent as a file.
  - An `http(s)` URL ➜ sent as a link.
  - Plain text ➜ saved to a temporary `.txt` and sent.
- **AirDrop Browser Tab** — Sends the URL of the active tab in your browser. Requires the [Raycast Browser Extension](https://raycast.com/browser-extension).
- **AirDrop Selected Text** — Sends the text currently highlighted in the frontmost app. URLs go through as links; anything else is dropped into a temporary `.txt`.
