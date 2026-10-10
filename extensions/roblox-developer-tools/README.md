# Roblox Developer Tools

Launch Roblox games, open places in Studio, publish changes, and restart servers directly from Raycast.

## Setup

Install Roblox and Roblox Studio, then configure the extension preferences in Raycast.

| Preference | Required for |
|---|---|
| Place ID | Launch Game, Open in Studio |
| Universe ID | Open in Studio, Restart Servers |
| API Key | Restart Servers |

Find your Place ID and Universe ID in the [Roblox Creator Dashboard](https://create.roblox.com/dashboard/creations).

### API Key

To use **Restart Servers**:

1. Create an API key in the [Creator Dashboard](https://create.roblox.com/dashboard/credentials).
2. Grant `universe:write` permission for your universe.
3. Configure allowed IP addresses.
4. Enter the API key in Raycast.

## Commands

- **Launch Game** — Launch your configured Roblox game.
- **Open in Studio** — Open your configured place in Roblox Studio.
- **Publish Place** — Publish the currently open place in Roblox Studio.
- **Restart Servers** — Restart servers across your universe.

## Notes

- Publishing requires Roblox Studio to be running with a place open, English menus, and Raycast's Accessibility and Automation permissions enabled.
- Publishing uses the currently open Studio place, regardless of the configured Place ID.
- Restarting servers disconnects affected players and does not publish unpublished changes.
- Restart options allow you to restart only outdated servers and disable confirmation prompts.