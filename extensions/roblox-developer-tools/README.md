# Roblox Developer Tools

Launch games, open and publish places in Studio, open Creator Dashboard, restart servers, and monitor player counts

## Setup

Add these in Raycast Settings → Extensions → Roblox Developer Tools:

| Setting     | Used by                                                                               |
| ----------- | ------------------------------------------------------------------------------------- |
| Universe ID | Player Count, Open in Studio, Open Game Page, Open in Creator Dashboard, Restart Servers |
| Place ID    | Launch Game, Open in Studio                                                           |
| API Key     | Restart Servers                                                                       |

Find your IDs in the [Creator Dashboard](https://create.roblox.com/dashboard/creations)

Create the API key in [Creator Dashboard → API Keys](https://create.roblox.com/dashboard/credentials), grant `universe:write` for the universe, and configure its allowed IP addresses

## Player Count

Run **Player Count** to display the total players across the configured universe. Use Raycast's **Show in Menu Bar** setting to control its visibility. No API key is needed.

The count refreshes approximately every 30 seconds using [Raycast background refresh](https://developers.raycast.com/information/lifecycle/background-refresh). Keep background refresh enabled for the **Player Count** command in Raycast settings; macOS may adjust the actual timing.

Enable **Hide when there are zero players** in the **Player Count** command's settings, alongside **Show in Menu Bar** and **Background Refresh**, to hide an empty universe. Refreshes continue while hidden, so the item reappears when players join. Connection errors display a warning instead of being treated as zero players.

## Open in Creator Dashboard

Opens the configured universe's **Overview** page in your default browser. Uses your **Universe ID**; no API key is needed.

## Open Game Page

Opens the configured universe's public Roblox game page in your default browser. Resolves the starting place from your **Universe ID**; no API key is needed.

Both browser commands show an opening notification only if the operation takes longer than 750 milliseconds.

## Publish Place

Studio must be running with a place open and use English menus

Allow Raycast access under System Settings → Privacy & Security → Accessibility and Automation

Publish Place publishes the place currently open in Studio
