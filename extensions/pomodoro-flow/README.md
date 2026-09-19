# Pomodoro Flow

A calm, keyboard-first Pomodoro timer for Raycast on macOS, inspired by the simplicity of Apple system apps and the complete focus/break loop of Pomofocus.

## What it includes

- Full focus → short break → long break cycle
- Persistent timer state that survives closing Raycast and restarting your Mac
- Menu-bar timer and controls
- Start, pause, resume, reset, and ±5-minute adjustments at any time
- Configurable focus, short-break, and long-break durations
- Configurable long-break cadence
- Optional automatic focus/break starts
- macOS completion notification and sound
- Bundled Pomodoro Flow completion chime for focus and break endings
- Session and cycle counts
- Keyboard shortcuts throughout

## Install for local use

1. Install Node.js 22 or newer if it is not already installed.
2. Open Terminal in this folder.
3. Run `npm install`.
4. Run `npm run dev`.
5. In Raycast, run **Pomodoro Flow in Menu Bar** once to activate the menu-bar item.

Use **Pomodoro Flow** for the full timer. Open the Action Panel with `⌘ K` to see controls and shortcuts. Duration and automation defaults live in the extension settings.

While using this as a local development extension, keep `npm run dev` running. Then run **Pomodoro Flow in Menu Bar** once from Raycast to activate the item. If macOS still does not show it, temporarily close another menu-bar app: macOS hides extras when there is not enough space around the camera notch. After a Raycast upgrade or migration, activate the menu-bar command again.

The full timer's **Set Duration…** action opens a visual duration picker. Raycast does not currently expose custom draggable dials or rotary controls to extensions, so this native grid is used instead; the ±5-minute controls remain available for quick adjustments.

## A note about menu-bar timing

Raycast menu-bar extensions are refreshed by Raycast and are not permanent background processes. Pomodoro Flow stores an absolute finish time, so the countdown remains accurate through sleep and restarts. When the full timer or menu is open, completion is detected immediately; while both are closed, Raycast's one-minute background refresh may deliver the alert up to roughly a minute after the finish time.

## Development

```sh
npm run lint
npm run build
```

Built against the current Raycast extension manifest and API conventions, with React 19 and TypeScript 5.
