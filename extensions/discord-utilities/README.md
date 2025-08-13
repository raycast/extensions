## Auto-detecting Discord installations
- On first run, the extension resolves default install paths under `%LOCALAPPDATA%`:
  - Stable: `%LocalAppData%/Discord/Update.exe`
  - PTB: `%LocalAppData%/DiscordPTB/Update.exe`
  - Canary: `%LocalAppData%/DiscordCanary/Update.exe`
- If exactly one installation is found, it is selected automatically as the chosen flavor.
- If multiple are found and you have not chosen one before, a selection list appears to choose which to use. Your choice is stored locally and used going forward.
- You can still set explicit overrides in Preferences for each flavor if your install paths differ.
# Raycast Discord Utilities (Windows)
Local-first, ToS-safe utilities for launching and navigating Discord on Windows via Raycast.

## Features (MVP)
- Pinned Links: user-managed list of `discord://` deep links (servers/channels/DMs). Search by name or tags.
  - You can paste a full `discord://` link, or provide Server/Channel/DM IDs and the command will compose the link for you.
- Bookmarks: save links to specific messages (guild or DM) and jump back any time.
  - Requires a full Discord message URL: `https://discord.com/channels/<guildOr@me>/<channel>/<message>`.
- Profiles: open Stable / PTB / Canary. Copy resolved path when available.
- Actions: open Discord (preferred flavor), open Settings, open Keybinds.
  - Settings subsections available: Voice & Video, Notifications, Appearance, Accessibility, Privacy & Safety, Advanced/Developer.
- LocalStorage: pins and preferences stored locally via Raycast. No tokens. No network calls.

## Requirements
- Windows with Discord installed (Stable/PTB/Canary supported)
- Raycast for Windows
- Node.js (for local development)

## Install & Run (local)
```bash
npm install
npm run dev
```

## Usage
- Command: "Discord Utilities" (`src/discord.tsx`).
  - Sections: Bookmarks, Pinned Links, Profiles (hidden after choosing flavor), Actions.
  - Profiles section is hidden once a Preferred Flavor is set in Preferences.
  - Pinned layout:
    - DMs are shown in their own section.
    - A Servers section shows each Server pin and all Channel pins grouped under their server (channels display an accessory tag with the server name).
    - Server items use a more fitting people icon.
  - Pinned item actions: Open, Copy Link, Edit, Remove.
    - Removing a Server pin will prompt you to confirm and will also remove all Channel pins associated with that server.
    - Remove actions are labeled explicitly by type: "Remove This Server Pin", "Remove This Channel Pin", and "Remove This DM Pin".
  - Bookmarks: Open, Copy Link, Edit, Remove.
  - Profiles: Open Stable/PTB/Canary, Copy Path.
  - Global actions: Open Discord (preferred), Open Settings, Open Keybinds, plus Settings subsections.
- Secondary command: "Add Discord Pin" (`src/discord-add-pin.tsx`).
  - The form accepts IDs to build the correct deep link if you don't paste a full URL.
  - Saved Guilds: when you save a Server pin, its `{ id, name }` is stored locally and offered as a dropdown when adding Channel pins, so you don't need to retype the Guild ID.
  - Field visibility by type:
    - Server: shows Guild ID only.
    - Channel: shows Guild (dropdown or manual) and Channel ID.
    - DM: shows DM Channel ID only (no Guild controls).
- Secondary command: "Open Discord by IDs" (`src/discord-open-by-ids.tsx`).
  - Single field: "Identifier or Link". Paste a Discord URL or supported ID formats to open immediately.
  - No saving required.

## Preferences
- Preferred Flavor: stable (default) | ptb | canary
  - Used to open Discord via Update.exe or the app executable if Update.exe is missing.
- Optional overrides: Stable/PTB/Canary paths to `Update.exe` or `Discord*.exe`

## How it works
- Launch routines (Windows):
  - Stable: `%LocalAppData%/Discord/Update.exe --processStart Discord.exe`
  - PTB: `%LocalAppData%/DiscordPTB/Update.exe --processStart DiscordPTB.exe`
  - Canary: `%LocalAppData%/DiscordCanary/Update.exe --processStart DiscordCanary.exe`
  - Fallback: if `Update.exe` is missing, launch `Discord*.exe` directly.
- Deep links: `discord://-/channels/<guild_id>/<channel_id>`; DMs: `discord://-/channels/@me/<channel_id>`.
- Settings links: `discord://-/settings` and `discord://-/settings/keybinds`.

## Constraints & Privacy
- No tokens, no scraping local DBs, no network requests.
- Uses only Raycast APIs and standard Node APIs.

## File Structure
- `src/discord.tsx`: Main list command UI.
- `src/discord-add-pin.tsx`: Secondary command to add a pin.
- `src/utils/discord.ts`: Windows-safe path resolution and launch helpers.
- `src/types.ts` and `src/types/index.ts`: Shared types.
- Asset: `assets/command-icon.png` (referenced in `package.json`).

## Future ideas (non-goals for MVP)
- Auto-discover servers/channels.
- Mute/Deafen via user-configured keybinds and a helper executable.
- Bot or OAuth flows.

## Troubleshooting
- If launching fails, ensure Discord is installed and `discord://` protocol is registered.
- Provide a path override in Preferences if Discord is installed in a non-standard location.

## License
MIT
