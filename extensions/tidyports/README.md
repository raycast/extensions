# TidyPorts for Raycast

See every local dev server running on your Mac, which agent started it, and stop the
strays — without leaving Raycast.

## Why

If you run coding agents across several git worktrees, they start dev servers you never
launched. `lsof` tells you something is on `:5173`. It doesn't tell you that `:5173` is the
auth refactor and `:5174` is the thing you abandoned two hours ago.

This lists them with **provenance**: a row reads `Claude Code, in Ghostty` rather than
`node`, alongside the branch and whether it's idle.

## Commands

**List Dev Servers** — every listener, searchable by port, project, branch or agent.

- <kbd>↵</kbd> open in the browser
- <kbd>⌘</kbd><kbd>.</kbd> copy the URL
- <kbd>⌃</kbd><kbd>X</kbd> stop the server (asks first)
- <kbd>⌘</kbd><kbd>⇧</kbd><kbd>O</kbd> open the project folder

## Requires the TidyPorts app

This reads from the `tidy-ports` CLI, which ships inside
[TidyPorts](https://tidyports.app) — a free macOS menu-bar app.

```sh
brew install --cask dan-fetch-studio/tap/tidyports
```

macOS 15+.
