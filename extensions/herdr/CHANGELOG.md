# Changelog

## [Session Selection and Switching] - {PR_MERGE_DATE}

- Select the session every command controls from Manage Sessions. Attaching a session selects it, Dashboard and Manage Agents name the session in their search bar, and a stopped selected session is shown as stopped with actions to start it or choose another instead of falling back to the default session.
- Attach a session in a new terminal window.
- Switch to a session in place: the selected session's clients in the terminal are detached and the new session is attached where they were. WezTerm reuses their window; Terminal and iTerm2 open a new one. A new preference chooses whether Enter attaches alongside or switches.

## [Fix Agent Focus and Agent Names] - 2026-09-11

- Switch to the agent's tab when focusing an agent. `agent focus` moves the server's focus but leaves the attached client drawing the tab it is already on, so the agent's pane never came into view. Workspaces and tabs were unaffected, because `workspace focus` and `tab focus` are what move the client.
- Name agents by the session title they set, rather than by their working directory. Two agents in one repository were indistinguishable. A title that is only the agent's own product name still yields to the directory.

## [Menu Bar Background Refresh] - 2026-09-03

- Refresh the menu bar in the background every minute instead of only when it is opened.

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
