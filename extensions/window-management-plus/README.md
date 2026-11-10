# Window Management+

A companion to Raycast's built-in Window Management commands. Those place one window at a time. These arrange every open window at once, so there is nothing to configure per app.

Inspired by [Hyprland](https://hypr.land/), the tiling window manager for Linux: master layouts, swapping, rotating and resizing the master all work the way they do there, as far as macOS allows.

| Command                                     | Result                                                                                                                                                              |
| :------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auto Tile                                   | Arrange every visible window in two even rows, or columns after Toggle Split.                                                                                       |
| Auto Tile with Sidebar                      | Pin the sidebar app full height down the right and tile every other visible window.                                                                                 |
| Smart Arrange                               | Arrange windows by what each app is for. The focused window leads the largest display with your other work beside it. Chat, mail and music go to the other display. |
| Toggle Split                                | Switch Auto Tile between rows and columns.                                                                                                                          |
| Master Layout Left / Right                  | The focused window becomes the master on one side. The rest stack on the other. On a display without the focused window, the largest window is the master.          |
| Master Layout Center                        | The focused window becomes the master in the middle and the rest stack on both sides. Made for wide displays.                                                       |
| Grow Master / Shrink Master                 | Give the master window more or less of the screen, in steps of 5%.                                                                                                  |
| Swap with Master                            | Trade places between the active window and the master.                                                                                                              |
| Swap Window Left / Right / Above / Below    | Trade places between the active window and its neighbour.                                                                                                           |
| Rotate Windows Clockwise / Counterclockwise | Move every window one slot round, keeping the last layout you tiled with. A pinned sidebar stays put.                                                               |
| Swap Displays                               | Move every window to the other display, keeping its place and size on the screen. With more than two displays, each display's windows move to the next.             |
| Distribute Across Displays                  | Spread your windows over every display, a share for each by size and no more than each can fit, then tile each display with the last layout you used.               |
| Move Others to Next Display                 | Keep the focused window on its display and move every other window there to the next display, tiled with the last layout you used.                                  |
| Move All to This Display                    | Move every window from your other displays to the display with the focused window, tiled with the last layout you used.                                             |
| Toggle Menu Bar Visibility                  | Hide or show the menu bar.                                                                                                                                          |

The names follow Hyprland too, so its users can search for `master`, `swapwindow`, `mfact`, `togglesplit` or `rollnext`.

Swap, Rotate, Grow Master and Toggle Split all work on the last layout you tiled with, so you can tile once and then rearrange.

When a display has more windows than fit at the sizes their apps allow, the smallest ones share one slot instead of half-covering each other. The active window always gets its own.

## Smart Arrange

Smart Arrange sorts apps into four roles: work, reference, communication and background. It reads the category each app declares to macOS, and corrects well-known apps whose category is missing or too broad, like browsers, mail, chat and terminals. An app it doesn't recognise is tiled as ordinary work.

## Ask Window Management+

In Raycast AI, mention `@window-management-plus` and say what you want, like "arrange my windows for coding" or "put chat and music on the laptop screen". It looks at which apps and windows are open, decides which display each belongs on and in what order, and tiles them. This needs Raycast AI.

## Requirements

- macOS and Raycast Pro. Moving windows uses Raycast's Window Management API, which is part of Pro. Without it, each command says so and leaves your windows alone.
- The first time you run a command, macOS asks whether Raycast may control System Events. Allow it, or turn it on later in System Settings › Privacy & Security › Automation. It is used to find and move Raycast's own windows, like Notes and AI Chat, and to toggle the menu bar.

## Preferences

- **Gap**: space between windows, from 0 to 24 points.
- **Sidebar**: the window Auto Tile with Sidebar pins down the right. Raycast Notes (the default) or AI Chat is opened if it isn't already. Active Window uses whichever window has focus.

## Screens

Every screen is tiled at once. Each window is assigned to the screen holding its center, and each screen uses its own usable area, so the menu bar and Dock are respected without any setting. Screen frames come from macOS, because the Raycast API does not report where screens sit.

## Limitations

- Only windows on the current desktop are arranged. Fullscreen windows are left alone.
- Some apps won't go below a minimum size. Those windows keep the size their app insists on, and the others fill the space that's left.
- Windows that can't be moved are named in the message shown after the command runs.
