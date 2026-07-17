# Caffeinate (Windows)

Keep your PC awake on demand — a Windows port of the popular [Coffee](https://www.raycast.com/mooxl/coffee) extension for Raycast on macOS. Same commands, same ideas, adapted to what Windows and Raycast for Windows actually support.

## Commands

| Command | Type | What it does |
| --- | --- | --- |
| **Caffeinate** | No-view | Keep the PC awake indefinitely |
| **Decaffeinate** | No-view | Turn caffeination off |
| **Toggle Caffeinate** | No-view | Flip caffeination on/off |
| **Caffeinate for ...** | No-view + arguments | Keep the PC awake for N hours/minutes/seconds |
| **Caffeinate Until** | View + argument | Keep the PC awake until a typed time (`5pm`) or a picked date/time |
| **Caffeinate While** | View | Keep the PC awake while a chosen running app stays open |
| **Caffeinate Status** | No-view, background refresh (15s) | Shows ✔/✖ status as the root search subtitle |
| **Caffeinate Status Dashboard** | View | Live status + one-click controls — see [Why no menu bar?](#why-no-menu-bar) |
| **Schedule Caffeination** | View | Recurring caffeination windows via natural language (e.g. "Monday and Tuesday from 09:00 to 17:00") |

It also ships six **AI tools** (in `src/tools/`) so Raycast AI can caffeinate, decaffeinate, check status, or set a schedule from a natural-language prompt.

## How it works

Windows has no `caffeinate` binary. Instead, this extension writes a small PowerShell helper script (`caffeinate-helper.ps1`) to the extension's support directory and launches it as a detached background process via Raycast's `runPowerShellScript`. That helper calls the Win32 `SetThreadExecutionState` API in a loop to tell Windows "don't sleep," and exits on its own once a duration elapses or a watched app closes.

To check status or turn caffeination off, the extension queries/kills that helper process by matching its command line (the same idea as the Mac version's `pgrep caffeinate` / `killall caffeinate`, just Windows-flavored via `Get-CimInstance Win32_Process`).

This mechanism was tested standalone (outside of Raycast) before the extension was built around it: the detached process survives across independent process boundaries, `SetThreadExecutionState` returns a valid success code, and the discovery/kill query correctly finds only the real helper process (not itself).

## Differences from the macOS version

- **No menu bar command.** Raycast's `MenuBarExtra` / `menu-bar` command mode is [not available on Windows](https://developers.raycast.com/api-reference/menu-bar-commands) ("Menubar commands aren't available on Windows"). **Caffeinate Status Dashboard** (a `view` command) is the closest substitute: open it any time for live status, a countdown, and one-click presets — it just doesn't sit persistently in a system tray the way the Mac menu bar icon does.
- **No "prevent disk sleep" preference.** macOS's `caffeinate -m` has no Windows equivalent, so that toggle was dropped. **Prevent display sleep** and **Prevent system sleep** remain, mapped to `ES_DISPLAY_REQUIRED` / `ES_SYSTEM_REQUIRED`.
- **"Caffeinate While" app detection** lists processes with a visible top-level window (via PowerShell) instead of macOS's AppleScript-based Dock enumeration, and it polls every 5 seconds to notice when the watched app closes (rather than the instant kqueue-based detection `caffeinate -w` gets on macOS).
- **Menu bar icon preferences** (pot/mug/cup/paper-cup picker, "hide when decaffeinated") were dropped since there's no persistent menu bar icon to skin or hide.

## Known limitation to verify on your machine

Raycast's Windows extension runtime may wrap spawned processes in a job object that terminates descendants when the parent exits. This extension's background helper is launched via `Start-Process` specifically so it *detaches* from that chain, and this was verified to survive independent process boundaries in isolated testing — but it hasn't been verified against Raycast's actual process sandbox (no way to drive the Raycast UI from here). **Please run the test checklist below after installing** to confirm the helper survives once the launching command's own process exits.

## Test checklist

Node.js/npm weren't available in the environment that built this extension, so `npm install`, `npm run build`, and `npm run dev` haven't been run. Please verify:

1. `npm install` completes cleanly.
2. `npm run build` (runs `ray build -e dist`) reports no type errors.
3. `npm run dev` starts, and in Raycast:
   - Run **Caffeinate** → confirm a HUD appears and the PC's screen/sleep settings stop kicking in (or check via Task Manager that a hidden `powershell.exe` process with `caffeinate-helper.ps1` in its command line is running).
   - Wait a bit (or close Raycast's dev session) and confirm that helper process is *still running* — this is the residual risk above.
   - Run **Decaffeinate** → confirm the helper process disappears.
   - Run **Toggle Caffeinate** twice → confirm it flips state each time.
   - Run **Caffeinate for ...** with e.g. `0` hours, `1` minute → confirm it auto-stops after ~1 minute.
   - Run **Caffeinate Until**, type `5pm` or pick a time → confirm it computes the right duration.
   - Run **Caffeinate While**, pick a running app, close that app → confirm caffeination stops within ~5 seconds.
   - Open **Caffeinate Status Dashboard** while caffeinated → confirm the live countdown and presets behave, and that clicking a preset/Decaffeinate works.
   - Check the root search subtitle for **Caffeinate Status** updates within 15 seconds of a state change.
   - Run **Schedule Caffeination**, type e.g. `Monday and Tuesday from 09:00 to 17:00` → confirm it's saved and shows up under "Today's Schedule" / "Caffeination Schedule".

## Before publishing

- Set `author` in `package.json` to your Raycast Store username (currently a placeholder).
- Confirm the extension `name` (`windows-caffeinate`) isn't already taken in the [raycast/extensions](https://github.com/raycast/extensions) store — rename if it collides.
- Add a `metadata/` folder with 1–6 screenshots (2000×1250px, PNG) per the [store preparation guide](https://developers.raycast.com/basics/prepare-an-extension-for-store).
- Run `npm run build` and `npm run lint` — fix anything they flag.
- Run `npm run publish` (or open a PR against `raycast/extensions` manually) per the [publishing guide](https://developers.raycast.com/basics/publish-an-extension).
