# goose-monitor

Find apps by name, PID, or port and quit them. Helpers are grouped under their app.

A [Raycast](https://raycast.com) extension for macOS.

## Features

- **Apps, not processes.** Electron helpers, Chrome renderers, and child workers are grouped under a single row with combined CPU and memory. You quit the whole app instead of hunting for individual helper processes (though you can still inspect and quit individual helpers if desired).
- **Search by port.** Search by port number (`8101` or `:8101`). Matches both active listening sockets (`lsof`) and ports declared in command-line arguments (e.g. `--server.port=8101` or `-Dserver.port=8101`), finding apps even before they finish binding.
- **No confirmation dialog.** Press Enter to quit the selected app immediately. There is no intermediate "are you sure" prompt.
- **Safe termination & post-exit verification.** Before sending `SIGTERM`, the extension verifies process identities against a fresh snapshot to ensure recycled PIDs are never terminated by mistake. Signals are delivered deepest-children-first to prevent respawning, and process exit is re-verified after signalling. If a process ignores `SIGTERM`, it suggests Force Quit.
- **Force Quit with SIGKILL.** Force Quit sends `SIGKILL` directly across the process tree to immediately terminate stubborn or hanging apps.
- **On-demand metric collection.** High-overhead two-frame network rate sampling (`nettop`, ~1s) only runs when viewing the **Network** category. Categories like **All**, **CPU**, **Memory**, **GUI**, and **Background** skip it completely for instantaneous (<100ms) listing and refreshes.
- **English by default.** The extension UI defaults to English. Choose **Chinese (Simplified)** under the **Interface Language** preference to switch languages; Store metadata remains in English.

## Installation

### Import Extension (Recommended)

1. Open Raycast.
2. Run **Import Extension**.
3. Select this repository folder (`raycast-monitor`).

### Development

```sh
npm install
npm run dev
```

`ray develop` builds the extension, imports it into Raycast automatically, and rebuilds on every file save.

Other scripts:

- `npm run build` — Bundle extension to `dist/`
- `npm run lint` — Run Raycast linter, ESLint, and Prettier checks
- `npm run fix-lint` — Auto-fix lint and formatting issues
- `bun test` — Run automated unit and integration tests

## Preferences

| Preference                | Type     | Default       | Description                                                                 |
| ------------------------- | -------- | ------------- | --------------------------------------------------------------------------- |
| Interface Language       | Dropdown | English       | Choose English or Chinese (Simplified) for the extension UI.                |
| Shared Settings JSON File | File     | Not set       | Optional shared settings file path. A separate override path can be chosen in Settings & Data Transfer. |
| Refresh Interval         | Dropdown | Every 3 seconds | Refresh the process list every 1, 2, 3, or 5 seconds, or turn refresh off.  |
| Show PID                 | Checkbox | Off           | Show each process ID in the list.                                           |
| Show Path                | Checkbox | Off           | Show each executable path in the list.                                      |
| Close Window             | Checkbox | Off           | Close the Raycast window after quitting a process.                          |

## Usage

1. Run **Manage Processes** from Raycast (the extension's single command).
2. Filter by app name, PID, or port number (`8101` or `:8101`).
3. Switch categories via the dropdown (**All**, **Apps**, **CPU**, **Memory**, **Network**, **Background**).
4. Press **Enter** to **Quit** the selected app (SIGTERM with exit verification).
5. Use **Force Quit** (`Cmd+Enter` or the secondary action) to send SIGKILL if an app hangs.
6. Open **Show Helpers** (`Cmd+Shift+H` or the secondary action) to inspect or terminate individual child helpers.

Open **Settings & Data Transfer** from the process list or an action panel to import/export settings and configure shared settings. The CPU and Memory menu bar commands are not registered; **Manage Processes** is the only command.

## How this differs from Kill Process

[Kill Process](https://raycast.com/rolandleth/kill-process) is a flat, usage-sorted process list that asks for confirmation. goose-monitor makes different trade-offs:

|                     | goose-monitor                                                    | Kill Process                    |
| ------------------- | ---------------------------------------------------------------- | ------------------------------- |
| Process List        | Grouped by app bundle; helpers collapsed under parent            | Flat process list               |
| Search              | App name, PID, listening ports, CLI-declared ports               | Process name, PID, path         |
| Quit Safety         | Re-verified against fresh snapshot; warns on recycled PID        | Signals listed PID directly     |
| Termination Flow    | Deepest-children-first SIGTERM + exit verification               | Flat signal dispatch            |
| Force Quit          | Dedicated Force Quit (`SIGKILL`) when graceful termination fails | Single kill action              |
| Protected Processes | Greyed out with reason (`system process`, `another user`)        | Shown; fails with generic error |
| On-Demand Sampling  | Heavy `nettop` rate sampling only runs in Network category       | Standard polling                |
| Confirmation        | None (Enter quits immediately)                                   | Optional confirmation dialog    |

## Repository Layout

- `src/` — Extension source code. Entry point: `src/manage-processes.tsx`.
- `src/lib/` — Independent macOS process management module (listing, grouping, search, ports, network, termination).
- `tests/` — Automated test suite with fixture and integration tests (`bun test`).
- `assets/` — Extension icons and metadata assets.

## Publishing

Before submitting to the Raycast Store, ensure `author` in `package.json` matches your Raycast username. Run `npm run lint` and `bun test` to ensure all checks pass.

## License

MIT
