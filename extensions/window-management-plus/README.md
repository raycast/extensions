# Window Management+

A companion to Raycast's built-in Window Management commands. Those place one window at a time. These arrange every open window at once, so there is nothing to configure per app.

| Command | Result |
|:---|:---|
| Auto Tile | Arrange every visible window in two even rows. |
| Auto Tile with Sidebar | Pin the sidebar app full height down the right and tile every other visible window in two rows. |
| Tile Largest Window Left | Largest window fills the left. The rest stack in a column on the right. |
| Tile Largest Window Right | Largest window fills the right. The rest stack in a column on the left. |
| Rotate Windows | Move each window into the next window's position. |
| Rotate Windows Backwards | Move each window into the previous window's position. |
| Swap Active Window with Largest | Trade places between the active window and the largest one. |
| Toggle Menu Bar Visibility | Hide or show the menu bar. |

## Requirements

* macOS and Raycast Pro. Moving windows uses Raycast's Window Management API, which is part of Pro. Without it, each command says so and leaves your windows alone.
* The first time you run a command, macOS asks whether Raycast may control System Events. Allow it, or turn it on later in System Settings › Privacy & Security › Automation. It is used to find and move Raycast's own windows, like Notes and AI Chat, and to toggle the menu bar.

## Preferences

* **Gap**: space between windows, from 0 to 24 points.
* **Sidebar**: the window Auto Tile with Sidebar pins down the right. Raycast Notes (the default) or AI Chat is opened if it isn't already. Active Window uses whichever window has focus.

## Screens

Every screen is tiled at once. Each window is assigned to the screen holding its center, and each screen uses its own usable area, so the menu bar and Dock are respected without any setting. Screen frames come from macOS, because the Raycast API does not report where screens sit.

## Limitations

* Only windows on the current desktop are arranged. Fullscreen windows are left alone.
* Some apps won't go below a minimum size. Those windows keep the size their app insists on, and the others fill the space that's left.
* Windows that can't be moved are named in the message shown after the command runs.
