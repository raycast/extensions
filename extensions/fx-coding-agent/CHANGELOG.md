# Fx Coding Agent Changelog

## [Initial Version] - 2026-08-24

- Added complete saved conversation history to session details, including every user and fx turn plus compact tool activity.
- Replaced raw Usage and Health JSON screens with searchable native Raycast lists, metadata, status colors, token breakdowns, and per-model usage.
- Added session actions to rename through fx's interactive `/rename` command, resume with recording, and create a recovered session copy.
- Kept raw diagnostic and usage JSON available as copy actions for troubleshooting.
- Fixed inline previews to use Raycast's supported `List.Item.Detail` component.
- Added commands to search and resume sessions, ask fx, open interactive sessions, check health, and view usage.
- Added Raycast AI tools to list sessions, inspect session history, and delegate confirmed coding requests to fx.
- Added actionable installation guidance and a confirmed Terminal installer action when fx is unavailable.
- Added extension preferences for the fx executable and default workspace.
