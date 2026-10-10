# Roblox Developer Tools

Launch a Roblox game, open it in Studio, and restart its servers from Raycast

## Setup

Install Roblox and Roblox Studio on macOS and sign in

In Raycast Settings → Extensions → Roblox Developer Tools, enter:

| Setting     | Used by                            |
| ----------- | ---------------------------------- |
| Place ID    | Launch Game and Open in Studio     |
| Universe ID | Open in Studio and Restart Servers |
| API Key     | Restart Servers                    |

Get your IDs from [Creator Dashboard](https://create.roblox.com/dashboard/creations) and use a place that belongs to the selected universe

Your Roblox account needs edit access to open the place in Studio

## API key

1. Create a key in [Creator Dashboard → API Keys](https://create.roblox.com/dashboard/credentials)
2. Give it access to your universe with the `universe:write` permission
3. Set its allowed IP addresses to include your network and check its expiry
4. Paste the key into the API Key setting in Raycast

The key is stored as a password preference and sent only to Roblox

## Restart options

Restart Servers affects every place in the universe and disconnects players in affected servers

- **Restart all versions**: turn off to restart outdated servers only
- **Ask before restarting**: turn off to skip confirmation

Restarting does not publish changes from Studio
