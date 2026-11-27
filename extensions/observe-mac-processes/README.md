# Observe macOS Processes (Raycast Extension)

A lightweight Raycast extension that snapshots running macOS processes, rolls up cryptic child processes into parent application bundles with plain-English functional labels, aggregates total CPU and memory usage, and provides immediate single-keystroke deep links to in-browser task managers.

## Key Capabilities

- **Application Bundle Roll-Up**: Groups multi-process apps (browsers, Electron apps, IDEs) under their parent `.app` bundle or root command.
- **Plain-English Functional Labels**: Automatically decodes cryptic command-line arguments into intuitive labels:
  - `Web Page / Tab Worker` (Firefox `plugin-container ... tab`, Chromium `--type=renderer`, WebKit WebContent)
  - `GPU Acceleration Process` (Firefox GPU Helper, Chromium `--type=gpu-process`, WebKit GPU)
  - `Network Service` / `Network / Socket Process`
  - `Media Decoding Process (RDD)`
  - `Audio Service` & `Storage / Cache Service`
  - `Extension Host / Node Service`
  - `TypeScript / Rust / Python / Go Language Servers`
  - `Spotlight Search Indexer` & macOS system daemons
- **Cumulative Resource Metrics**: Aggregates real-time CPU% across all rolled-up threads and computes cumulative resident memory (RSS).
- **Hottest Child Process Surfacing**: Automatically pinpoints the single hottest worker consuming the most CPU or RAM within any bundle.
- **Single-Keystroke Deep Links**:
  - **Firefox**: Press **Enter** to open `about:processes` directly in Firefox to inspect tabs, extensions, and memory.
  - **Google Chrome / Brave / Edge**: Press **Enter** to activate the browser's native Task Manager or discards manager.
  - **Arc**: Press **Enter** to open Arc's process manager (`arc://discards`).
- **Targeted Worker Termination**: Terminate an individual hot worker with `Cmd+Shift+K` without killing your entire application, or terminate the entire bundle with `Cmd+Opt+K`.
- **Worker Drill-Down View**: Press `Cmd+Enter` to view a dedicated sub-list of every child worker with its PID, PPID, exact command-line arguments, CPU%, and memory.

## Keyboard Shortcuts

| Action | Shortcut | Description |
|---|---|---|
| Open Browser Task Manager | `Enter` | Pops `about:processes` or native Task Manager |
| View Child Workers | `Cmd+Enter` | Drill down into all child processes |
| Terminate Hot Worker | `Cmd+Shift+K` | Send `SIGTERM` to the hottest child worker |
| Terminate Entire Bundle | `Cmd+Opt+K` | Send `SIGTERM` to all processes in the bundle |
| Reveal in Activity Monitor | `Cmd+Shift+A` | Open macOS Activity Monitor |
| Copy Diagnostic Summary | `Cmd+C` | Copy bundle CPU, RAM, and hot worker stats |
| Copy Bundle Path | `Cmd+Opt+C` | Copy application file path |
| Refresh Snapshot | `Cmd+R` | Re-run process snapshot |
| Toggle Detail Sidebar | `Cmd+D` | Expand/collapse the detail inspection pane |

## Development

Build the extension:
```bash
npm run build
```

Run in development mode:
```bash
npm run dev
```

Run linting:
```bash
npm run lint
```
