# Craft Agents

Open, resume, and navigate [Craft Agents](https://craft.do) sessions straight from Raycast. Built on the `craftagents://` deeplink protocol — no IPC, no network, just one keystroke to the right view.

## Why

Every new session, every resume, every settings trip is a trip out of Raycast — back to the app, click the menu, wait for focus. This extension compresses those moments to a single command.

## Requirements

- macOS
- [Craft Agents](https://craft.do) desktop app (registers the `craftagents://` URL scheme)
- Raycast 1.80+

## Commands

| Command | What it does |
|---------|--------------|
| **New Session** | Opens a fresh session, optional input + permission mode args. |
| **New Session (Quick)** | Like the app's menu "New Session" — zero args. |
| **Quick Ask** | Type a message → new session → message auto-sent. |
| **Resume Session** | Browse, search, and resume recent sessions. Flag / copy inline. |
| **Flagged Sessions** | Starred-only list, with inline unflag / delete. |
| **Open View** | Jump to Sessions / Flagged / Sources / Skills / Settings. |
| **Open Source** | List configured sources, trigger OAuth inline. |
| **Open Skill** | Browse global + workspace skills. |

## Preferences

- **Workspace Root** (required) — path to your Craft Agents workspace folder, the one that contains `sessions/`, `sources/`, and `skills/`. Supports a leading `~`.
- **Global Skills Dir** — additional skill source merged into Open Skill. Defaults to `~/.agents/skills`.

## Source code

[github.com/CodePirate7/raycast-craft-agents](https://github.com/CodePirate7/raycast-craft-agents)
