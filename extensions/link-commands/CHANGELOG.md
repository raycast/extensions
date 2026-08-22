# Link Commands Changelog

## [Initial Version] - 2026-08-21

### Added

- **Create Link Command** — turn a URL, a folder or a search into a Script Command. Writes the header, makes it executable, and fetches the site's icon into your script directory rather than hotlinking it. `{query}` anywhere in a URL becomes a percent-encoded argument, so a search containing `&` keeps all of its terms.
- **Search Link Commands** — browse the link commands in your script directories, ordered by package so everything belonging to one service sits together. The detail pane shows the target, the application it opens in and the argument it prompts for.
- Sections by environment, and filters for environment, category and package.
- The create form offers the environments and categories already present in your own commands, with a _New…_ escape, so it teaches your vocabulary rather than imposing one.
- Package names are learned from the commands you already have: once a link to `theorchard.atlassian.net` is filed under `Jira`, the next one suggests `Jira` rather than `Atlassian`.
- Actions to run a command through its Raycast deeplink, run it in a terminal to see its output, open it in an editor, reveal it in Finder, open or copy its containing folder, duplicate it, and move it to the Trash.
- Non-executable scripts are flagged, since Raycast silently ignores them, with a Make Executable action to fix them in place.
