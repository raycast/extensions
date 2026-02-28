# Jattends — Raycast Extension

A Raycast extension for quickly switching between Claude Code sessions. Complements the [Jattends](../) menubar app.

## Features

- Lists all active Claude Code sessions grouped by status (Waiting / Working / Ready)
- Fuzzy search by project name, directory path, or session ID
- Press Enter to jump directly to the correct terminal window
- Works with Ghostty, iTerm2, Terminal.app, kitty, Alacritty, WezTerm, and more
- Automatically cleans up stale sessions

## Install

```bash
cd raycast-extension
npm install
npm run build
```

Then open Raycast, search "Import Extension", and select the `raycast-extension` folder. The extension persists across Raycast restarts.

For development, use `npm run dev` instead of `npm run build` to get auto-reload on file changes.

## Requirements

- [Jattends](../) menubar app installed (provides the Claude Code hook that writes session files)
- Raycast
- Accessibility permission for Raycast (System Settings → Privacy & Security → Accessibility)

## How it works

The Claude Code hook (`~/.claude/hooks/jattends-hook.sh`) writes a JSON file per session to `~/.claude/jattends/sessions/`. The extension reads these files, groups them by status, and provides fuzzy search.

When you press Enter on a session, the extension identifies the correct terminal window by writing a temporary title marker to the session's TTY (via OSC 2 escape sequence), then uses System Events to find and raise that window.

## Session statuses

| Status | Label | When |
|--------|-------|------|
| `waiting` | **Waiting** | Claude needs your input (permission request, asked a question) |
| `active` | **Working** | Claude is generating a response |
| `idle` | **Ready** | Session is open, waiting for your next prompt |
