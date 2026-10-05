# Connect to VPN

Control your macOS VPN connections from Raycast and the menu bar, with favorites and a hotkey to toggle your last-used VPN.

## Setup

1. Configure your VPN in macOS System Settings and complete any authentication required by your VPN provider.
2. Open **Show Network Services** in Raycast and connect to a VPN, or choose **Use for Toggle Last Used** from its actions and confirm the shortcut target.
3. Assign a hotkey to **Toggle Last Used** in Raycast Settings to connect or disconnect that VPN directly.

The extension controls services exposed by macOS network tools. VPN apps that manage connections independently may require their own app or Raycast extension.

## Commands

- **Show Network Services** lists your VPNs and their status. Connect, disconnect, add favorites, change favorite order, or select the VPN used by the toggle shortcut. Search by service name or type. Press `⌘R` to discover added or removed services and refresh their status.
- **Toggle Last Used** toggles the VPN most recently selected or controlled through this extension. It gives setup guidance if none is selected and reports when the saved VPN is missing, unavailable, or already changing state. Changing a connection outside this extension does not select it for the shortcut.
- **Network Services** shows VPN controls in the menu bar. Its icon adapts to the menu bar appearance and reflects whether any listed VPN is connected. Hover over the icon to see the connected VPN names. It refreshes every 30 seconds and after changes made through the extension. Use **Refresh Status** to refresh manually.

Connecting and disconnecting labels mean macOS has been asked to change the connection. The status updates as macOS reports progress; authentication or provider errors can still prevent a connection.

## Favorites and filtering

Favorites retain their manual order regardless of connection status. They are saved by service name so changing the network service order in macOS does not move a favorite to a different VPN. Existing favorites are migrated using the network order when their services are listed. Saved entries for temporarily absent services are retained. Renaming a service requires selecting it and adding it to favorites again.

**Filter Services** hides unavailable and non-VPN entries by default. Turn it off to see other network services, including disabled VPN configurations. Unavailable services cannot be connected from the extension.

## Troubleshooting

- If the toggle shortcut has no selected VPN, open **Show Network Services** and choose **Use for Toggle Last Used**.
- If a VPN is missing or unavailable, check System Settings and your provider's app, then refresh. Disabled configurations must be enabled outside the extension.
- If Raycast reports that this extension requires a newer Raycast API version, update Raycast using **Check for Updates**. The extension cannot bypass the host's API compatibility check.

## Development

Run `npm ci`, then `npm run build`, `npm test`, `npx tsc --noEmit`, and `npm run lint`. The regression tests use the development-only React test renderer and mock Raycast storage and macOS commands; they do not change VPN connections. Use `npm run dev` for manual verification in Raycast.
