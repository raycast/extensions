# Peepy

<p align="center">
  <img src="assets/icon.png" width="128" alt="Peepy icon" />
</p>

<h1 align="center">Peepy</h1>

<p align="center">
  <strong>Keep your computer awake so your AI agents can keep working.</strong><br />
  A Raycast extension for macOS and Windows.
</p>

---

## The Problem

You kick off a long task — Claude Code refactoring a repo, Codex running a multi-step job, a big local build or indexing pass then walk away. Twenty minutes later you come back to find your machine went to sleep and the whole run is dead.

## The Fix

**Peepy** is a one-keystroke keep-awake switch that lives in Raycast. Open Raycast, hit **Peepy**, pick a duration, done. Your machine stays awake until you say otherwise — no System Settings spelunking, no terminal commands to remember.

## Features

- ⚡ **Instant on/off** — toggle keep-awake straight from Raycast
- ⏱️ **Timed presets** — 15 min, 30 min, 1 h, 2 h, 4 h, or run indefinitely
- 🖥️ **Cross-platform** — native `caffeinate` on macOS, `SetThreadExecutionState` helper on Windows
- 🔍 **Live diagnostics** — see the tracked helper process, its PID, and whether it's still running
- 🧹 **Self-healing** — expired or dead sessions are detected and cleaned up automatically
- 🚫 **No bloat** — zero API keys, zero accounts, zero configuration

## How It Works

| Platform | Mechanism |
| --- | --- |
| macOS | Spawns the built-in `caffeinate` utility with display + idle prevention flags |
| Windows | Launches a hidden PowerShell helper that periodically calls the Win32 `SetThreadExecutionState` API |

The extension records the helper's PID in Raycast's support directory, so you can inspect, stop, or reset the session from the diagnostics panel at any time.

## Usage

1. Install the extension from the [Raycast Store](https://www.raycast.com/store) (or run it locally — see Development below)
2. Open Raycast and type **Peepy**
3. Pick **Enable** or a timed preset
4. Walk away — your agents keep working
5. Come back and **Disable** when you're done

### Verify everything is back to normal

- The status row shows **Inactive**
- Diagnostics shows **No Tracked Process** or **Stopped**

If anything ever looks stuck, hit **Force Reset State**.

## Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run lint     # validate package.json, icons, ESLint, Prettier
npm run build    # production build
```

## Credits

Built by [Vinay](https://x.com/vinayrp_dev).

Inspired by and based on [Flow.Launcher.Plugin.Caffeine](https://github.com/o850cHQk/Flow.Launcher.Plugin.Caffeine), originally made for Flow Launcher.

## License

MIT
