# Window Management+

A companion to Raycast's built-in Window Management commands. Those place one window at a time. These arrange every open window at once, so there is nothing to configure per app.

Inspired by [Hyprland](https://hypr.land/), the tiling window manager for Linux: master layouts, swapping, rotating and resizing the master all work the way they do there, as far as macOS allows.

| Command                                     | What it does                                                                                                                                                                                                |
| :------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auto Tile                                   | Arrange every window on every display in an even grid. Use Cycle Tile Layout to change the grid's shape.                                                                                                    |
| Cycle Tile Layout                           | Change the shape of Auto Tile. Each run steps to the next shape: all windows side by side, two small above one large, then two small beside one large.                                                      |
| Toggle Sidebar                              | Open the window chosen in the Sidebar setting and pin it full height down the right of the screen. Run it again to unpin. While it is pinned, every other command arranges the remaining windows beside it. |
| Smart Arrange                               | Arrange windows by what each app is for. The focused window leads your largest display with related work beside it. Chat, mail and music go to your other display.                                          |
| Master Left / Right                         | Make the focused window the master on one side, with every other window stacked on the other.                                                                                                               |
| Master Center                               | Make the focused window the master in the middle, with the other windows stacked on both sides. Best on wide displays.                                                                                      |
| Cycle Master Layout                         | Move the master to its next position. Each run steps round: left, then right, then center.                                                                                                                  |
| Make Master Larger / Smaller                | Give the master window 5% more or less of the screen. The stacked windows take up the difference.                                                                                                           |
| Swap with Master                            | Make the focused window the master. It trades places with the current master.                                                                                                                               |
| Swap with Next Window                       | Trade places between the focused window and the next one in the layout. With two windows, they simply swap.                                                                                                 |
| Rotate Windows Clockwise / Counterclockwise | Move every window one position round in the current layout. A pinned sidebar stays where it is.                                                                                                             |
| Swap Displays                               | Send every window to your other display and tile it there. With more than two displays, each display's windows move to the next one.                                                                        |
| Distribute Across Displays                  | Spread windows over all your displays in proportion to their size, so no display is crowded while another sits empty.                                                                                       |
| Move Others to Next Display                 | Keep only the focused window on this display. Every other window here moves to your next display.                                                                                                           |
| Move All to This Display                    | Bring every window from your other displays to the one you are working on.                                                                                                                                  |
| Toggle Menu Bar Visibility                  | Hide or show the macOS menu bar, to give windows the full height of the screen.                                                                                                                             |

The names follow Hyprland too, so its users can search for `master`, `swapnext`, `mfact`, `togglesplit` (Cycle Tile Layout) or `rollnext`.

Swap, Rotate, Make Master Larger and Smaller, and Cycle Tile Layout all work on the layout you last tiled with, so you can tile once and then rearrange. They act on the display you are working on. Auto Tile, Smart Arrange and the Master commands tile every display.

When a display has more windows than fit at the sizes their apps allow, the smallest ones share one slot instead of half-covering each other. The active window always gets its own.

## Smart Arrange

Smart Arrange sorts apps into four roles: work, reference, communication and background. It reads the category each app declares to macOS, and corrects well-known apps whose category is missing or too broad, like browsers, mail, chat and terminals. An app it doesn't recognise is tiled as ordinary work.

## Ask Window Management+

In Raycast AI, mention `@window-management-plus` and say what you want, like "arrange my windows for coding" or "put chat and music on the laptop screen". It looks at which apps and windows are open, decides which display each belongs on and in what order, and tiles them. This needs Raycast AI.

## Requirements

- macOS and Raycast Pro. Moving windows uses Raycast's Window Management API, which is part of Pro. Without it, each command says so and leaves your windows alone.
- The first time you run a command, macOS asks whether Raycast may control System Events. Allow it, or turn it on later in System Settings › Privacy & Security › Automation. It is used to find and move Raycast's own windows, like Notes and AI Chat, and to toggle the menu bar.

## Preferences

- **Window Gap**: the gap between windows.
- **Screen Gap**: the gap from windows to the screen edge.
- **Sidebar**: the window Toggle Sidebar opens and pins to the right of the screen. Raycast Notes (the default) and AI Chat are opened if they aren't already. Focused Window pins whichever window you are in when you run it, so any app can be the sidebar.

Window Gap and Screen Gap have the same names and sizes as the settings in Raycast's own Window Management: None, Tiny, Small, Medium, Large and Extra Large. An extension can't read Raycast's settings, so choose the same sizes here if you want them to match.

## Screens

Every screen is tiled at once. Each window is assigned to the screen holding its center, and each screen uses its own usable area, so the menu bar and Dock are respected without any setting. Screen frames come from macOS, because the Raycast API does not report where screens sit.

## Limitations

- Only windows on the current desktop are arranged. Fullscreen windows are left alone.
- Some apps won't go below a minimum size. Those windows keep the size their app insists on, and the others fill the space that's left.
- Windows that can't be moved are named in the message shown after the command runs.
