# Otty Raycast Extension

Raycast commands for the locally installed Otty terminal.

## Commands

- Search Otty Tabs: browse Otty by tab, pane, or window, with coding-agent status, a live pane preview, and Send Message
- Otty Agents (menu bar): agents that need input, one click away
- Jump to Directory: Otty's most-visited folders, or git repositories under a folder you choose; pin favorites
- Otty Settings: search, toggle, and edit Otty's settings
- Change Otty Theme: a grid of theme previews for light and dark mode
- Open Otty Recipe: open an exported `.ottyrecipe` file from a folder you choose
- Open in Otty: open the selected Finder folders as tabs and files in Otty's viewer (or the front Finder window)
- New Window
- New Tab
- Open Directory
- Run Command
- SSH (accepts ssh options, e.g. `-p 2222 user@host`)

## Local Setup

The extension defaults to:

```text
/Applications/Otty.app/Contents/MacOS/otty-cli
```

If your Otty CLI lives somewhere else, update the Raycast extension preference `Otty CLI Path`.

`Open in Otty` opens the folders selected in Finder as new Otty tabs and the
selected files in Otty's viewer. With nothing selected and Finder in front, it
opens the front Finder window's folder (or the Desktop when no window is open),
which uses macOS Automation: on first use, macOS may ask you to allow Raycast
to control Finder. If Otty can't open a tab, a new window opens instead.

## Development

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run dev
```
