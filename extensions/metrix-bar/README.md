# Metrix.Bar for Raycast

Search your installed [Metrix.Bar](https://metrix.bar/) dashboards in [Raycast](https://www.raycast.com/) on macOS. Open dashboard panels or settings, and create Quicklinks to open frequently used dashboards directly from Raycast's root search.

## Requirements

Install and launch [Raycast](https://www.raycast.com/) and [Metrix.Bar](https://metrix.bar/) on your Mac.

## Connect to Metrix.Bar

The extension fetches your installed dashboards from Metrix.Bar's local HTTP API. Configure the connection before your first use:

1. Launch Metrix.Bar and go to **Settings → Agent**.
2. Enable Local API, then copy the actual API base URL (**Local API URL**) and Bearer token (**API Token**) shown in the interface.
3. In Raycast, run the **Search Dashboards** command and open extension preferences when prompted.
4. Enter your **Local API URL** and **API Token**.

Configuration notes:

- **URL format**: Only HTTP loopback base URLs are supported, using `127.0.0.1`, `localhost`, or `[::1]`. The example `http://127.0.0.1:6387` shows the format only; use the actual port displayed on your Agent settings page. Do not include subpaths such as `/v0/dashboards`, query parameters (`?`), usernames, or passwords.
- **Token storage**: The API token is stored using Raycast's password preference and is used solely for authenticating with the local API.

## Search and open dashboards

Open the **Search Dashboards** command in Raycast to list all dashboards installed in your local Metrix.Bar. Type in the search bar to filter by title or instance ID. If a dashboard does not have a title, its instance ID is displayed instead.

Press `Enter` to open a dashboard. The default action depends on whether the dashboard is enabled:

| Status                       | Press Enter             | Action menu (`⌘K`)                             |
| :--------------------------- | :---------------------- | :--------------------------------------------- |
| Enabled                      | Open panel              | Add to Raycast Search, Open Dashboard Settings |
| Disabled (tagged `Disabled`) | Open dashboard settings | Open Dashboard Settings                        |

Keyboard shortcuts and actions:

- `⌘R`: Manually refresh the dashboard list. The list does not poll automatically.
- `⌘K`: Open the Raycast action menu. In addition to dashboard actions, common actions are always available: **Refresh Dashboards**, **Open Metrix.Bar**, **Open Agent Settings**, and **Extension Preferences**. These common actions remain accessible even when connection fails or the list is empty.

## Add dashboards to Raycast search

Raycast does not automatically index items from extension lists in its root search. To open an enabled dashboard directly from root search, create a Quicklink:

1. Select any enabled dashboard in **Search Dashboards**.
2. Press `⌘⇧K`, or choose **Add to Raycast Search** from the action menu (`⌘K`).
3. Check the Quicklink name and press `⌘↵` to save.

Once saved, typing the Quicklink name in Raycast root search opens the dashboard panel directly. You can also assign an alias or hotkey in Raycast preferences.

Notes:

- Save each frequently used dashboard once.
- Saved Quicklinks launch Metrix.Bar directly without querying the local API first.
- If a dashboard is later disabled, opening its Quicklink falls back to the dashboard's settings only if your Metrix.Bar version supports panel link fallback.

## Troubleshooting

When an error message appears or the list is empty, open the action menu (`⌘K`) to quickly open Metrix.Bar or relevant settings:

| Message                                                        | Common Cause                                                           | Resolution                                                                                                                                       |
| :------------------------------------------------------------- | :--------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Could Not Connect to Metrix.Bar** / **Connection Timed Out** | Metrix.Bar is not running, local API is disabled, or URL is incorrect. | Make sure Metrix.Bar is running, enable Local API in **Settings → Agent**, verify the port in **Local API URL** matches the app, and press `⌘R`. |
| **Check Connection Preferences**                               | API URL or token format is invalid.                                    | Check extension preferences and enter the HTTP base URL and token shown in Agent settings.                                                       |
| **Authentication Failed**                                      | API token does not match or was reset.                                 | Copy the current token from **Settings → Agent** in Metrix.Bar and paste it into **API Token** in extension preferences.                         |
| **No Dashboards Installed**                                    | No dashboards are installed locally.                                   | Install a dashboard in Metrix.Bar, then press `⌘R` in Raycast.                                                                                   |
| **No Matching Dashboards**                                     | No dashboards match the current search query.                          | Check for typos, search by title or instance ID, or clear the search query.                                                                      |

### Privacy and network access

Quicklinks and connection error messages never contain the API token. The dashboard list is retrieved from the local API; when a dashboard uses a named icon or remote image, Raycast also requests the icon from Iconify or the corresponding image URL.

## License

[MIT License](https://github.com/agili-app/metrix-bar-raycast/blob/main/LICENSE)

Copyright 2026 Agili
