# Menu Navigator

- Allows you to run menu item commands from the Raycast menu.
- Includes the added benefit of displaying the keyboard shortcuts as well.

## Notes

- Initial processing of app menu items generally takes 30-60 seconds per app.
  - We cache these items to speed up interactions after the initial load.
  - Apps with a large amount of menu items can take a few minutes (Example: Affinity Design)
  - Menu items that change based on application state will not be tracked / updated
    - For example: Arc browser has a show / hide sidebar command that changes based on whether the sidebar is visible or not
- To refresh data, please run `Refresh Menu Items` from the Actions Menu.
- _Shortcut Note:_ If Raycast is focused, it can conflict with the keyboard shortcuts displayed.
  - _Example:_ Settings `⌘ ,` shortcut will open Raycast's settings, not Apple Notes settings if Raycast is focused.
