# DockLock Plus

Move the macOS Dock between displays and choose where it may appear from Raycast. The extension requires DockLock Plus 2.2.0 or later. Open DockLock Plus once to complete setup. [Get DockLock Plus](https://docklockpro.com)

## Commands

| Command | What it does |
| --- | --- |
| Set Dock Control Mode | Choose Lock to Selected Displays, Dock Follows Mouse, or Off. A checkmark shows the current mode. |
| Move Dock Left, Right, Up, or Down | Request a move to the neighboring display in that direction. |
| Move Dock to Display by Name | Search connected displays by name or number and choose a destination. |
| Allow Dock on Display | Add a compatible display to the allowed displays for the current arrangement. |
| Disallow Dock on Display | Remove a display from the allowed displays for the current arrangement. |

The display picker uses DockLock's display numbers and custom names. It sends the selected display's ID, so two monitors with the same name can be targeted individually.

For manual moves, choose **Lock to Selected Displays** and place the Dock at the bottom. If DockLock cannot identify the current display, use **Move Dock to Display by Name** to specify a destination. Raycast reports when DockLock accepts the request.

To follow the active window for one app or for any app, configure **App Rules** in DockLock Plus Settings. [DockLock Plus CLI reference](https://docklockpro.com/docks/cli-plus/)

## Support

Contact [DockLock support](mailto:support@docklock.pro).
