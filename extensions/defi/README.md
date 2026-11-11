# Defi

Reach [Defi](https://github.com/qeude/Defi), the scrolling-columns window
manager for macOS, from Raycast: switch windows, jump between workspaces, and
run any Defi command. The extension only runs the `defi` command line tool
inside Defi.app and makes no network calls, so window titles stay on your Mac.

Requires [Defi.app](https://github.com/qeude/Defi/releases/latest) in
`/Applications` or `~/Applications`, or picked in the extension's preferences.

## Commands

**Search Windows** finds any window Defi manages by title, app, or workspace;
the dropdown narrows it to one workspace. Windows you pick often come first,
and the focused one comes last. Acting on a window from another workspace shows
that workspace for a moment, because Defi focuses the window first.

| Key | Action |
| --- | --- |
| ↵ | Focus the window |
| ⌘↵ | Pick a workspace to move it to |
| ⇧↵ | Bring it to the current workspace |
| ⌘⇧F | Float or tile it |
| ⌘⇧C / ⌘⇧I | Copy its title or ID |

**Search Workspaces** lists the workspaces of every display with their window
count and apps; search by name, number, or app.

| Key | Action |
| --- | --- |
| ↵ | Go to the workspace |
| ⌘↵ / ⌘⇧↵ | Move the focused window there, or send it without following |
| ⌥↵ / ⌥⇧↵ | Move or send the focused column |
| ⌘O | List the workspace's windows |

**Search Commands** runs any Defi command, with the ones you ran last on top.
The side pane says what each one does, its default shortcut, and the line to
paste into `[keys]`. The search text also works as an argument:

| Type | To |
| --- | --- |
| `60`, `+10`, `-10`, `960` | Set or change the column width, in percent or points |
| `h50`, `h+10` | Set or change a stacked window's height |
| `2`, `web` | Go to a workspace, or move the focused window or column there |

Type the same text after the command in the root search, as in
`Search Commands 60`. ⌘↵ copies a command in the form `[keys]` accepts. See
[Commands](https://github.com/qeude/Defi/blob/main/CONFIGURATION.md#commands).

In every list, ⌘Y shows or hides the side pane and ⌘R reloads. Shortcuts shown
are Defi's defaults, with `mod` as ⌃⌥; your own `[keys]` may differ. Give Search
Windows a hotkey or an alias such as `w` to reach it in one keystroke.

## Troubleshooting

- **Defi Is Not Installed**: install Defi, or pick Defi.app in **Defi App** in
  the extension's preferences.
- **Defi Is Not Running**: press Enter to launch it; the list fills in once
  Defi starts.
- **Update Defi** or **Update This Extension**: Defi and the extension read
  different versions of the JSON format. Update the older one.
