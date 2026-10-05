# RayTerm

The Raycast Terminal Emulator.

RayTerm brings a persistent terminal into Raycast. Run commands, keep sessions alive after closing Raycast, switch between terminal tabs, and use interactive terminal apps without leaving your launcher.

## Features

- Persistent terminal sessions backed by a local daemon
- Terminal tabs inside Raycast
- ANSI color rendering with an SVG terminal view
- Adjustable terminal scale
- Built-in themes
- Support for shell commands, REPLs, Vim, Codex, OpenCode, and other terminal apps
- macOS-native setup with no external terminal window

## How it works

RayTerm runs a small local Python daemon that owns your PTY sessions. The Raycast extension connects to that daemon over a Unix socket, renders the terminal as SVG inside Raycast's markdown detail view, and uses the Raycast search bar as the input line.
