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

## How it works

* `src/lib/layouts.ts` is pure maths: items and an area in, frames out.
* `src/lib/arrange.ts` runs a layout against a window system: lay out each screen, apply the frames, read them back. A window that an app clamps keeps that size and the layout runs again. The window system is passed in, so this is tested against an in-memory fake.
* `src/lib/raycast.ts` is the real window system: the Raycast WindowManagement API, plus System Events for screens and for Raycast's own windows. Every coordinate conversion lives here.
* Each command file is a few lines that pick a layout.

## Develop

```sh
npm install
npm test
npm run dev   # imports the extension into Raycast
```

Needs Raycast Pro on macOS for the WindowManagement API.

## Screens

Every screen is tiled at once. Each window is assigned to the screen holding its center, and each screen uses its own usable area, so the menu bar and Dock are respected without any setting. Screen frames come from macOS, because the Raycast API does not report where screens sit.

## Not ported yet

* Monocle Next. The API has no raise or z-order, so it stays a Script Command for now.
