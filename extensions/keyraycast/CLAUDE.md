# keyraycast

A Raycast extension that shows keystrokes on screen (like KeyCastr). Useful for screen recordings, demos, and bug reports. Also captures modifier+clicks and right-clicks.

## Architecture

- **Raycast extension** (`src/`): TypeScript. `toggle.tsx` is the toggle command, `helper.ts` manages the helper process lifecycle.
- **Swift helper binary** (`assets/KeyraycastHelper`): Pre-compiled universal (arm64+x86_64) macOS binary that captures keystrokes and mouse clicks via CGEventTap and displays them in a floating NSPanel overlay. Runs as an independent background process.
- **Helper source** (`sources/keyraycast-helper/`): Swift package with source code for the helper binary.

### How it works

1. Raycast command writes config JSON to a temp file (includes display mode, position, appearance, mouse clicks toggle, etc.)
2. Launches the helper binary with `--config`, `--pid`, `--log` args via shell
3. Helper reads config, creates NSPanel + CGEventTap (keyboard + mouse events), runs NSApplication.run() forever
4. Helper writes its PID to a temp file for later cleanup
5. Toggle off: Raycast reads PID file and sends SIGTERM

### Building the helper

```bash
npm run build-swift
```

This compiles a universal binary (arm64+x86_64) from `sources/keyraycast-helper/` and copies it to `assets/KeyraycastHelper`.

### Key files

- `src/toggle.tsx` — Raycast "Toggle Keystroke Overlay" command
- `src/helper.ts` — spawns/kills the helper binary, manages PID file, polls for startup
- `assets/KeyraycastHelper` — compiled universal Swift binary (committed, rebuilt via `npm run build-swift`)
- `sources/keyraycast-helper/` — Swift package source for the helper binary
  - `Sources/EventTap.swift` — CGEventTap for keyboard + mouse capture, TIS keyboard layout caching, tap auto-recovery, permission verification
  - `Sources/KeystrokeOverlay.swift` — NSPanel floating overlay UI with dark/light/auto theming, multi-monitor support
  - `Sources/main.swift` — entry point, config parsing, signal handling, run loop

### Config options (passed via JSON)

- `displayMode` — allKeys, allModified, commandKeys
- `position` — bottomCenter, bottomLeft, bottomRight, topCenter, topLeft, topRight
- `displayDuration` — seconds (0.5 to 5.0)
- `fontSize` — small, medium, large
- `showMouseClicks` — show modifier+clicks and right-clicks
- `appearance` — dark, light, auto (matches system), glass (liquid glass on macOS 26+, falls back to auto)

## Gotchas

- **Settings only apply on toggle**: The helper reads config once at startup. Raycast `no-view` commands have no lifecycle to detect preference changes. Users must toggle off then on to apply new settings. This is a Raycast platform limitation, not a bug.
- **Raycast build scans subdirectories**: `ray build` walks all subdirectories looking for `package.json`. Any directory with a `Package.swift` but no `package.json` will error. The `sources/` directory works because Raycast only errors on directories it identifies as potential npm modules (varies by CLI version). If this breaks, move the Swift source to a dotfile directory like `.sources/`.
- **Swift bridge is request/response only**: The official `swift:` import bridge (`extensions-swift-tools`) spawns a new process per function call and exits after returning. It cannot maintain persistent state like an overlay window or event tap. That's why we use a standalone helper binary instead.
- **Helper process must be fully detached**: Raycast kills the extension process after a `no-view` command completes. The helper must be launched via shell backgrounding (`&`), not Node.js `detached: true` (which still dies when the parent exits). Config is passed via temp file, not stdin.
- **Event tap can be disabled by macOS**: Under heavy system load (common during screen recordings), macOS disables event taps. The helper auto-recovers by re-enabling the tap when it receives `tapDisabledByTimeout` or `tapDisabledByUserInput`.
- **Partial accessibility permissions**: A combined keyboard+mouse event tap can succeed even without full keyDown permissions (flagsChanged doesn't require them). The helper creates a test keyDown-only tap after startup to verify full permissions are granted.

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

### Available skills

- `/office-hours`
- `/plan-ceo-review`
- `/plan-eng-review`
- `/plan-design-review`
- `/design-consultation`
- `/design-shotgun`
- `/review`
- `/ship`
- `/land-and-deploy`
- `/canary`
- `/benchmark`
- `/browse`
- `/connect-chrome`
- `/qa`
- `/qa-only`
- `/design-review`
- `/setup-browser-cookies`
- `/setup-deploy`
- `/retro`
- `/investigate`
- `/document-release`
- `/codex`
- `/cso`
- `/autoplan`
- `/careful`
- `/freeze`
- `/guard`
- `/unfreeze`
- `/gstack-upgrade`
