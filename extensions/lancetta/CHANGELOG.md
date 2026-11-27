# Lancetta Changelog

## [Lancetta's exports] - {PR_MERGE_DATE}

- Needs Lancetta 0.70 or later: the extension now reads Lancetta's own exports (`history`, `sessions` and `tokens`, plus the new `window` of each suggestion) instead of its private files, and says when the installed Lancetta is older
- Token Usage is current without opening Lancetta: the app counts the transcripts when asked
- Agent Sessions follows Lancetta's own columns and Concluded list, and opens a session with the command Lancetta gives

## [Initial Version] - {PR_MERGE_DATE}

- Show Quota: each agent's 5-hour and 7-day windows, per-model weeks, refusals and Lancetta's suggestions, with Lancetta's week charts and 5-hour clock in a side pane
- Agent Sessions: the Claude Code and Codex sessions working and waiting on you, opened in your terminal
- Token Usage: Claude Code's tokens per day and per project
- Codex Processes: the Codex plugin's app-server trees and the orphans holding memory
- `@lancetta` AI tools for quota, sessions, tokens and processes
