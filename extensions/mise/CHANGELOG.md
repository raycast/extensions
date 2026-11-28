# Mise Changelog

## [Vulnerability Audit] - 2026-11-25

- Show Outdated Tools lists installed tools with known vulnerabilities in a **Vulnerable** section above the outdated ones (mise 2026.11.12 or later). Each warning icon is colored by the highest severity: red for high or critical, orange for medium, yellow for low or unrated. Each row shows the advisory count, the highest severity and the first version that fixes them all, when the advisories name one. **Show Advisories** lists them, with a link to each.
- **Upgrade Vulnerable Tools** upgrades only the affected tools. When a tool has no newer version in its configured range, the toast names it and offers **Upgrade Past Range**.
- The Tools Menu Bar lists vulnerable tools first, with the same colored warning, and counts them in its tooltip.

## [Task Tags and Run History] - 2026-11-19

- Manage Tasks shows task tags (mise 2026.11.2 or later), filters by them, and runs every task with a tag in the terminal.
- Manage Tasks shows how each task's last run ended and its median duration (mise 2026.11.3 or later).
- The Raycast AI skill covers task editing, tags, run history and npm provenance checks.
- Raycast AI can list installed and outdated tools and global tasks, and, after you confirm, run a global task, add a tool to the global config or upgrade tools.

## [Global Task Editing, Update Notice and Raycast AI Skill] - 2026-11-09

- Manage Tasks can create, edit and delete global tasks on mise 2026.10.25 or later.
- Show Outdated Tools and the Tools Menu Bar show when a newer mise is out, and offer the update command that matches how mise was installed.
- Tools that mise couldn't check for updates are listed instead of being reported as up to date.
- Tools whose requested version isn't installed now appear in Show Outdated Tools.
- Outdated checks, upgrades and the task list use only the global config, so a `~/mise.toml` or a `MISE_<TOOL>_VERSION` variable no longer leaks in. This needs mise 2026.10.7 or later for outdated checks and upgrades.
- Added a **Global Tools and Tasks** Agent Skill for Raycast AI.

## [Initial Version] - 2026-10-09
