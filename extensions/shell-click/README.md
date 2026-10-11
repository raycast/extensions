# Shell Click for Raycast

The companion extension for [Shell Click](https://shellclick.dev), a macOS app for saving and running project commands. Search and control your Shell Click commands, workspaces, and listening ports directly from Raycast.

**Requires Shell Click 0.1.25 or later, installed separately.** [Download Shell Click](https://shellclick.dev).

## Setup

1. Download Shell Click from [shellclick.dev](https://shellclick.dev), move **ShellClick.app** to Applications, and launch it.
2. Add your commands and their working folders in Shell Click. Create workspaces there to organize them.
3. Open **Search Command** in Raycast.

The extension finds your installed app automatically. If you keep it elsewhere, set **Shell Click App Path** in the extension preferences to the absolute path of `ShellClick.app`. Reopen Search Command after changing this preference.

## Features

- Search by command name, command text, folder path, or detected port.
- Filter all commands, running commands, listening ports, or a Shell Click workspace.
- Open a command’s terminal or editor in Shell Click; start, stop, restart, or delete saved commands.
- Copy working-folder paths or open folders in another app.
- Inspect listening ports and stop their processes after confirmation.
- Open Shell Click’s Commands and Settings tabs.

Workspaces come from Shell Click; they are not generated automatically from folder paths. The extension uses the same saved commands and sessions as the app.

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| Return | Open the selected item’s actions |
| ⌘ Return | Start or stop the selected command |
| ⌘ R | Refresh |
| Escape | Go back |

Lists refresh when opened, when filters change, after actions, or with **⌘ R**.

## Troubleshooting

If the extension cannot find Shell Click, install the latest app and check **Shell Click App Path**. The app must include its bundled command helper. If opening a terminal or editor fails, launch Shell Click once, then retry.

The extension communicates locally with Shell Click’s bundled helper. It does not upload your commands or create separate copies of your commands and workspaces. Stop sends SIGTERM. Force Kill sends SIGKILL; process actions require confirmation.

## Development

```sh
npm install
npm run dev
npm run check
npm run build
```

For a development build of Shell Click, set **Shell Click App Path** to that build’s absolute app path.
