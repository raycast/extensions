# Swift Salamander for Raycast

Open paths, Finder selections, and saved workspaces in
[Swift Salamander](https://swiftsalamander.app), a dual-pane file manager for
macOS.

## Requirements

- macOS 13 or newer
- Swift Salamander with support for the `swiftsalamander://v1` URL protocol

## Commands

- **Open Path** accepts one path, including `~`, `~/Downloads`, an absolute
  path, or a local `file:` URL.
- **Open Clipboard Path** opens the local path currently on the clipboard.
- **Open Finder Selection** opens up to ten selected items from one folder.
  Run it while Finder is the frontmost app.
- **Open Swift Salamander** brings the app to the front.
- **Open Saved Workspace** applies an existing workspace by its exact name.

Saved Workspace starts disabled. Enable it in Raycast Settings under Extensions
> Swift Salamander if you use that workflow.

## Preferences

In Raycast Settings, open Extensions > Swift Salamander and choose whether path
commands navigate the active pane, the opposite pane, or a new tab. Active Pane
is the default.

## Development

Run `npm install` and `npm run dev` to install the development extension in
Raycast. Before submitting changes, run `npm test`, `npm run lint`, and
`npm run build`.
