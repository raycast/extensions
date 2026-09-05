# Claude Code Projects

Browse your [Claude Code](https://claude.com/claude-code) projects and resume sessions in your favorite Windows terminal, straight from Raycast.

## How this differs from the other Claude Code extensions

The Store already has several Claude Code extensions — Claude Code Launcher, ClaudeCast, Vibelet Search, Claude Session Bookmarks, Claude Code Cheatsheet. Every one of them ships for macOS, so none of them appears in Raycast for Windows. This extension declares `"platforms": ["Windows"]` and exists for that gap: on macOS those extensions cover this ground well.

Launching a terminal on Windows is a different problem, and the extension is built around it:

- **Windows terminals** — a new tab in Windows Terminal, or a standalone PowerShell 7 / Windows PowerShell / cmd window that still loads your shell profile (oh-my-posh and friends). No AppleScript, no Accessibility permissions.
- **A repaired environment** — Raycast for Windows runs inside an MSIX container whose environment can be stale or missing variables entirely, to the point where `claude` does not resolve. The extension reads the machine and user PATH from the registry, locates the executable itself, and hands the launched shell a fixed PATH (plus sane `APPDATA`/`LOCALAPPDATA`/`TEMP`, and no invalid BCP-47 locale that would break POSIX tools).
- **Deliberately one command** — list projects, preview sessions, resume one. No usage dashboards, prompt libraries, menu-bar monitors, or session bookmarking.

## Features

- **Project list** — every project found in `~/.claude/projects`, sorted by most recent activity, with session count and last-used date. The real project path is extracted from the session files, so it works even for paths containing dashes.
- **Open in Claude** (default action) — opens your terminal in the project folder and runs `claude`, which shows the interactive dialog to continue, compact, or start fresh.
- **Continue Last Session** — runs `claude --continue` to resume the most recent session without prompts.
- **Resume Specific Session** (`Ctrl+S`) — lists the project's sessions with a preview of each conversation and resumes the selected one via `claude --resume <id>`.
- **Open in VS Code** (`Ctrl+O`) — runs `code .` in the project folder.
- **Open in Explorer** (`Ctrl+E`) and **Copy Path** (`Ctrl+C`).

## Requirements

- Windows with [Claude Code](https://claude.com/claude-code) installed and available as `claude`.
- Windows Terminal (recommended, default) or PowerShell 7 / Windows PowerShell / cmd.
- Optional: VS Code with its `code` CLI on the PATH, for the *Open in VS Code* action.

## Preferences

- **Terminal** — where projects open:
  - *Windows Terminal — new tab*: opens a tab in the most recent window (or a new one) running Claude directly. The tab closes when Claude exits.
  - *PowerShell 7 / Windows PowerShell — new window*: opens a standalone window, loads your PowerShell profile (e.g. oh-my-posh), then runs Claude. The shell stays open after Claude exits.
  - *Command Prompt (cmd) — new window*: same, with cmd.
- **Extra Claude Arguments** — appended to every `claude` invocation (e.g. `--model opus`).

## Notes

The extension resolves the `claude` executable and the system PATH from the Windows registry at launch time, so it works even when Raycast was started with a stale environment (a common issue for GUI apps on Windows).
