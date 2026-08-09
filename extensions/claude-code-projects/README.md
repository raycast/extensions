# Claude Code Projects

Browse your [Claude Code](https://claude.com/claude-code) projects and resume sessions in your favorite Windows terminal, straight from Raycast.

## Features

- **Project list** — every project found in `~/.claude/projects`, sorted by most recent activity, with session count and last-used date. The real project path is extracted from the session files, so it works even for paths containing dashes.
- **Open in Claude** (default action) — opens your terminal in the project folder and runs `claude`, which shows the interactive dialog to continue, compact, or start fresh.
- **Continue Last Session** — runs `claude --continue` to resume the most recent session without prompts.
- **Resume Specific Session** (`Ctrl+S`) — lists the project's sessions with a preview of each conversation and resumes the selected one via `claude --resume <id>`.
- **Open in Explorer** (`Ctrl+E`) and **Copy Path** (`Ctrl+C`).

## Requirements

- Windows with [Claude Code](https://claude.com/claude-code) installed and available as `claude`.
- Windows Terminal (recommended, default) or PowerShell 7 / Windows PowerShell / cmd.

## Preferences

- **Terminal** — where projects open:
  - *Windows Terminal — new tab*: opens a tab in the most recent window (or a new one) running Claude directly. The tab closes when Claude exits.
  - *PowerShell 7 / Windows PowerShell — new window*: opens a standalone window, loads your PowerShell profile (e.g. oh-my-posh), then runs Claude. The shell stays open after Claude exits.
  - *Command Prompt (cmd) — new window*: same, with cmd.
- **Extra Claude Arguments** — appended to every `claude` invocation (e.g. `--model opus`).

## Notes

The extension resolves the `claude` executable and the system PATH from the Windows registry at launch time, so it works even when Raycast was started with a stale environment (a common issue for GUI apps on Windows).
