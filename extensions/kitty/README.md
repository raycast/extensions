# Kitty for Raycast

Control the [Kitty terminal emulator](https://sw.kovidgoyal.net/kitty/) directly from Raycast via its remote control protocol.

## Commands

### New Kitty Window
Opens a new OS-level Kitty window. If Kitty is not running, it launches it automatically.

### New Kitty Tab
Opens a new tab in the currently active Kitty window. If Kitty is not running, it launches it automatically.

### Search Kitty Tabs
Browse all open tabs across every Kitty window and jump to any of them instantly.

- **Focus** a tab to bring it to the foreground
- **Copy** the tab title or its working directory to the clipboard
- **Close** a tab directly from Raycast
- **Refresh** the list at any time with `⌘R`

### Open Kitty Launch Configuration
Define and launch multi-window, multi-tab, multi-pane Kitty sessions from YAML configurations stored in Raycast.

Configurations are written in YAML and support:
- Multiple OS windows
- Multiple named tabs per window
- Split panes (vertical or horizontal) within a tab
- A working directory (`cwd`) per tab or pane
- Shell commands to run automatically on launch (`exec`)

**Example configuration:**
```yaml
name: My Project
windows:
  - tabs:
      - title: Editor
        layout:
          cwd: ~/projects/myapp
          commands:
            - exec: nvim .
      - title: Dev Server
        layout:
          cwd: ~/projects/myapp
          commands:
            - exec: npm run dev
      - title: Logs
        layout:
          cwd: ~/projects/myapp
          split_direction: vertical
          panes:
            - cwd: ~/projects/myapp
              commands:
                - exec: tail -f logs/app.log
            - cwd: ~/projects/myapp
              commands:
                - exec: tail -f logs/error.log
```

### Open with Kitty
Opens the folder currently shown in Finder in a new Kitty window, with its working directory set to that folder.

## Setup

Most commands rely on Kitty's remote control socket. Add the following line to your `kitty.conf`:

```
listen_on unix:/tmp/kitty-socket
```

Then restart Kitty. The extension will auto-detect the socket, or you can set a custom path in the extension preferences.

## Preferences

| Preference | Description |
|------------|-------------|
| **Socket Path** | Path to the Kitty remote control socket. Leave empty to auto-detect `/tmp/kitty-socket-{pid}`. |
