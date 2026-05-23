# PortKill

PortKill helps you answer “what is using port 3000?” inside Raycast. It scans local TCP listeners, shows the owning process, and lets you stop one process or every process in the list.

## Features

- Lists listening TCP ports with process name, PID, and endpoint
- Search by port, process name, or PID
- Kill one process or all unique PIDs (with confirmation)
- Graceful stop first, then force termination if the process is still running
- Works on **macOS**, **Windows**, and **Linux** (see platform notes below)

## Usage

Open Raycast and run **PortKill**.

| Action | macOS | Windows | Description |
| ------ | ----- | ------- | ----------- |
| Refresh | `⌘R` | `Ctrl R` | Rescan TCP listeners |
| Kill All | `⌘⇧K` | `Ctrl Shift K` | Stop every unique PID (confirmation) |
| Kill Process | `↵` | `↵` | Stop the selected row’s PID |
| Show/Hide Details | `⌘⇧D` | `Ctrl Shift D` | Toggle the detail pane |

Shortcuts are declared with `Keyboard.Shortcut.Common` and the per-platform
`{ macOS, Windows }` syntax described in the [Raycast keyboard
docs](https://developers.raycast.com/api-reference/keyboard), so they map to
the right modifier on each OS automatically.

Use the detail pane for full endpoint and connection metadata.

## Platform notes

| Platform | Scan | Kill |
| -------- | ---- | ---- |
| macOS | `lsof` | `kill` (SIGTERM → SIGKILL) |
| Windows | `netstat` + `tasklist` | `taskkill` (graceful → `/F`) |
| Linux | `ss` (falls back to `lsof`) | `kill` (SIGTERM → SIGKILL) |

On Linux, `ss -tlnp` may omit process names for listeners owned by other users unless you run Raycast with sufficient privileges. Install `lsof` if `ss` is unavailable.

The Windows scanner detects `LISTEN` state from the wildcard foreign address (`0.0.0.0:0` / `[::]:0`) rather than the literal `LISTENING` token, so it works on non-English Windows installs where `netstat` localizes the state column. Likewise, the Windows killer treats "process already gone" as a successful kill by re-querying `tasklist` instead of matching localized error strings.

Raycast’s store manifest lists **macOS** and **Windows** in the [`platforms`](https://developers.raycast.com/information/manifest) field. The extension code also supports Linux for local development and future Raycast platforms.

## Development

```bash
npm install
npm run dev
```

Other scripts:

- `npm run build` — production build (run before publishing)
- `npm run lint` / `npm run fix-lint` — ESLint
- `npm run publish` — open a pull request to the [Raycast Store](https://developers.raycast.com/basics/publish-an-extension)

Set `"author"` in `package.json` to your [Raycast account](https://raycast.com) username before linting or publishing.

## Safety

PortKill can terminate any process it lists. Only stop processes you recognize.
