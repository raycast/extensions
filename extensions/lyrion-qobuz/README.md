# Lyrion Qobuz Search

Search and play music from Qobuz via your Lyrion Music Server (LMS) from Raycast.

## Requirements

- **Lyrion Music Server** (LMS) running on your network with the Qobuz plugin installed and signed in
- A **player** (Squeezebox or compatible) connected to LMS
- **Raycast** for macOS

## Setup

1. Install this extension from the Raycast Store (or clone and run in development mode).
2. Open **Raycast Preferences → Extensions → Lyrion Qobuz Search** and configure:
   - **LMS Host** – Hostname or IP of your LMS (e.g. `192.168.0.21` or `lms.local`)
   - **LMS Port** – JSON-RPC port (default `9000`)
   - **Player ID** – MAC address of the player to control (e.g. `00:00:00:00:00:10`)

You can find the player MAC in the LMS web UI: **Settings → Player → Basic Settings**, or in the LMS server settings.

## Usage

- Use the **Search Qobuz** command and type to search albums, artists, tracks, and playlists.
- **Enter** – Play now  
- **Shift + Enter** – Play next  
- **Cmd + Shift + Enter** – Add to queue  
- **Cmd + C** – Copy title/artist (and album for tracks)

## Development

```bash
npm install
npm run dev
```

Then open the extension in Raycast (development mode).

## Publishing to the Raycast Store

1. Set **`author`** in `package.json` to your [Raycast Store username](https://www.raycast.com/store) (the handle from your profile URL, e.g. `raycast.com/YourUsername`). The linter validates this against Raycast's API, so it must be your real store handle.
2. Run `npm run build` and `npm run lint` and fix any issues.
3. Run `npm run publish` and follow the prompts to open a PR against the [Raycast extensions repo](https://github.com/raycast/extensions).

See [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store) for full requirements (icon 512×512, README for setup, etc.).
