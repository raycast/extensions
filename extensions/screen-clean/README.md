English | [简体中文](README.zh-CN.md)

# Screen Clean

A Raycast extension that turns every display pure black and optionally locks the keyboard, so you
can clean your screen and keyboard without triggering shortcuts. It works on **macOS** and
**Windows**. No data is collected or sent anywhere.

## Features

- Pure black, borderless overlay on every connected display
- Optional system-wide keyboard lock (strict mode)
- Exit by pressing `Esc` 5 times, with an on-screen counter
- Automatic timeout, configurable from 30 seconds to 5 minutes
- Hard 30-minute fail-safe when using "until manually stopped"
- Display sleep is prevented while cleaning
- Mouse input is never blocked, so you can always wait out the timer
- No network access, no telemetry

## Commands

| Command                            | Description                                                   |
| ---------------------------------- | ------------------------------------------------------------- |
| **Start Cleaning Mode**            | Blacks out every display. Press `Esc` 5 times to exit.        |
| **Stop Cleaning Mode**             | Ends cleaning mode immediately.                               |
| **Grant Keyboard Lock Permission** | macOS only. Requests Accessibility permission for the helper. |

## Preferences

| Preference               | Default   | Description                                                                                                          |
| ------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------- |
| **Cleaning Duration**    | 5 minutes | 30 seconds, 1 minute, 2 minutes, 5 minutes, or "until manually stopped" (capped at 30 minutes).                      |
| **Strict Keyboard Lock** | Off       | Globally swallow keyboard events. On macOS this needs Accessibility permission; on Windows it uses a low-level hook. |
| **Exit Hint**            | On        | Show a faint exit hint when cleaning starts and when the overlay is clicked. The Esc counter is always shown.        |

The session always ends automatically, even when "until manually stopped" is selected.

## Usage

1. Open Raycast and run **Start Cleaning Mode**.
2. Every display goes black. The hint and the Esc counter appear in the center of each screen.
3. Press `Esc` 5 times to exit. The counter shows `2/5`, `3/5`, and so on.
4. If you pause for more than 2 seconds between presses, the count resets.

Use **Stop Cleaning Mode** to end a session immediately.

## How it works

Raycast commands cannot draw their own full-screen windows, so the extension spawns a small native
helper per platform and exits. The helper keeps running independently.

### macOS

The helper is `assets/ScreenCleaner`, a universal binary (arm64 + x86_64) built from
`native/main.swift`.

```text
Raycast no-view command
  └─ spawn detached → ScreenCleaner
       ├─ one borderless black NSWindow per display, level = CGShieldingWindowLevel()
       ├─ optional CGEventTap that swallows keyboard events globally
       ├─ 5 Esc presses (counter on screen) / auto-exit timer / SIGTERM → fade out and quit
       └─ prevents display sleep while cleaning
```

- The helper is copied to the extension's support directory before each run. This keeps its path
  and code signature stable, which matters for the Accessibility permission.
- Without Accessibility permission, strict keyboard lock falls back to passive mode: the overlay
  still receives and swallows keys while it is focused, and a hint explains the fallback.

### Windows

The helper is `assets/ScreenCleaner.ps1`, executed with Windows PowerShell 5.1. It compiles a small
C# helper in memory with `Add-Type`:

- One borderless, topmost black WinForms window per monitor (`Screen.AllScreens`)
- Optional `WH_KEYBOARD_LL` low-level keyboard hook that swallows every key system-wide
- The same 5 Esc press gesture and on-screen counter, plus the auto-exit timer
- Display sleep prevention via `SetThreadExecutionState`
- **Stop Cleaning Mode** terminates the PowerShell process with `taskkill`

The first start takes an extra second or two because the embedded C# code is compiled on the fly.
If compilation or startup fails, the error is written to
`<extension support directory>/screen-cleaner.log`.

## Installation

### Requirements

- **Raycast** on macOS or Windows
- **macOS 12 or newer** for the macOS helper
- **Windows 10/11** with the built-in Windows PowerShell 5.1 for the Windows helper
- **Node.js 20+** and **Xcode Command Line Tools** (macOS only) for development

### From source

```bash
git clone git@github.com:YangGong-Zi/screen-clean.git
cd screen-clean
npm install
npm run dev
```

`npm run dev` rebuilds or refreshes the native helpers, then starts Raycast development mode.

### Production build

```bash
npm run build
```

## Strict keyboard lock setup

### macOS

1. Run **Grant Keyboard Lock Permission** from Raycast.
2. Enable **ScreenCleaner** in _System Settings → Privacy & Security → Accessibility_. The helper
   path is copied to the clipboard; if it is not listed, click `+` and paste it.
3. Turn on **Strict Keyboard Lock** in the extension preferences.

TCC permissions are bound to the helper's path and code signature. Rebuilding the helper with
different contents may require granting the permission again.

### Windows

No extra permission is required. Turn on **Strict Keyboard Lock** in the extension preferences; the
helper installs a low-level keyboard hook.

If the hook cannot be installed, the helper falls back to passive mode and shows a hint.

## Safety and limitations

- This is a cleaning cover, **not a security lock**. The power button, Touch ID / Windows Hello,
  `Ctrl+Alt+Del`, the UAC secure desktop, and other OS-level mechanisms still work.
- The auto-exit timer is always active. The "until manually stopped" option exits after 30 minutes.
- If the overlay gets stuck, the timer will release it. On macOS, force restart the Mac as a last
  resort: strict mode blocks keyboard input globally, so typing `pkill` is not possible while it is
  active. On Windows, `Ctrl+Alt+Del` still opens the secure screen.
- The mouse cursor stays visible.
- On Windows, some antivirus products may flag a process that installs a global keyboard hook. The
  hook is only required for strict keyboard lock; passive mode works without it.
- Enterprise policies may block `Add-Type` or global hooks. Check the log file if the Windows helper
  does not start.

## Development

```bash
npm run dev          # refresh helpers, then start Raycast dev mode
npm run build:helper # copy the Windows helper; on macOS, also compile assets/ScreenCleaner
npm run build        # helpers + Raycast production build
npm run lint
```

Manual helper tests (each blacks the screen for about 2 seconds):

```bash
# macOS
./assets/ScreenCleaner --seconds 2 --no-hint

# Windows PowerShell
powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File .\assets\ScreenCleaner.ps1 -Seconds 2
```

Raycast persists values that users select in Preferences. Changing a `default` in `package.json`
only affects users who have not already set that preference.

## Project layout

```text
src/
  start-cleaning.ts           # Raycast commands
  stop-cleaning.ts
  grant-accessibility.ts
  lib/screen-cleaner.ts       # per-platform helper copy/spawn/PID management
native/
  main.swift                  # macOS: overlay, event tap, timers
  build.sh                    # macOS universal build + ad-hoc signing
  windows/ScreenCleaner.ps1   # Windows: WinForms overlay + keyboard hook
scripts/
  build-helper.cjs            # cross-platform helper build/copy step
assets/
  ScreenCleaner               # generated macOS binary
  ScreenCleaner.ps1           # generated copy of the Windows helper
```

## Publishing to the Raycast Store

Keep `native/` and `scripts/build-helper.cjs` in the repository so reviewers can verify the helper
sources. The macOS helper is a prebuilt universal binary, so check the Raycast Store's current
requirements for bundled binaries and repository visibility before publishing. Rebuild the helpers
with `npm run build:helper` whenever their sources change.

## Repository

<https://github.com/YangGong-Zi/screen-clean>
