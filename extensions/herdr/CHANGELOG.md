# Changelog

## [Fix Stuck Menu Bar Toast] - 2026-08-29

- Report menu bar failures with a HUD instead of a toast held open across the action. Clicking an item unloads the menu bar command, which left the toast on screen with nothing to resolve it.

## [Bug Fixes] - 2026-08-18

- Show a readable name for unnamed agents instead of the status-line glyph.
- Select the configured session with the `--session` flag on every CLI call and terminal launch, including the default session.
- Report a started agent or delivered prompt as successful even when a follow-up focus or history step fails.
- Prompt and focus a newly started agent by pane id. Default names get a numeric suffix when the kind collides with a live agent.
- Derive the Prompt Agent target from the live agents list so a refresh cannot reroute the prompt.
- Split the pane chosen at submit time, not whichever pane the server has focused.
- List only linked worktrees in Manage Worktrees.
- Read renamed pane labels, keep commas in environment values, and parse integration status lines that carry both a version and a path.
- Clear the Ghostty focus marker through the CLI so a timed-out focus cannot leave a stale title.
- Surface menu bar action failures as toasts.
- Expand `{command}` inside larger words in the Custom Terminal Launcher and reject embedded `{args}`.

## [Fix Tilde Paths] - 2026-08-13

- Expand `~` in the configured Herdr binary path.

## [Initial Release] - 2026-07-23

- Browse and control Herdr workspaces, tabs, panes, and agents.
- Start and prompt agents from configurable destinations.
- Create Start Agent Quicklinks with prefilled configurations.
- Manage sessions, worktrees, plugins, and integrations.
- Monitor agent status from the menu bar.
- Focus or open resources in the configured terminal.
- Use global commands for pane navigation, splitting, zoom, and tab creation.
