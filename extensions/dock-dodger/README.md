# Dock Dodger

Raycast extension that moves windows out from behind the Dock.

## Commands

- **Lift Windows Above Dock**: one-shot. Every window that overlaps the Dock icons gets pushed up (or sideways for a left/right Dock) into the visible area.
- **Keep Windows Above Dock**: same thing every 10 seconds in the background. Run it once to activate, use "Deactivate Command" in Raycast to stop.

## Install

```sh
npm install
npm run dev
```

`npm run dev` registers it in Raycast. You can stop the dev server afterwards; the extension stays installed.

First run asks for two permissions:

- Privacy & Security > Accessibility: Raycast
- Privacy & Security > Automation: Raycast > System Events

## Preferences

- **Gap Above Dock**: pixels between window and Dock (default 8)
- **Fit**: shrink windows that are too tall to fit above the Dock (default on)
- **Ignored Apps**: comma-separated app names to leave alone

## How it works

1. JXA reads screen geometry from `NSScreen.visibleFrame`, the Dock's icon strip via System Events and all on-screen windows via `CGWindowListCopyWindowInfo` (one fast call; asking System Events per app took 30s+).
2. `src/lib/geometry.ts` decides what moves (pure TS, tested with `npm test`).
3. A second JXA call applies the moves, matching each window on its frame so nothing gets moved if you dragged it in between.

Skips minimized and fullscreen windows. Does nothing when the Dock auto-hides.

## Author

Tim Broddin
