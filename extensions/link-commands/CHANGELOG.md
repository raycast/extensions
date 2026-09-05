# Link Commands Changelog

## [Readable Rows] - {PR_MERGE_DATE}

### Changed

- A list row leads with the command's name and carries its host in the subtitle, rather than the other way round. Leading with the host is right in Raycast's own launcher, where a row appears among apps and extensions and the domain says _this opens a browser_ before anything else is read — but in a list where every row is already a link command that signal fires on all of them and distinguishes none, while spending the front of the only column that can differ. Several commands on one service shared their leading characters and rendered as near-identical rows. The host is not lost: it moves to the subtitle, where it answers _is this the one I want_ instead. A title that is only a host keeps it, and shows its package in the subtitle as before — as does a command with no icon, since the mark is what normally names the brand and a row without one has nothing else carrying it.
- Nothing searchable changed. The full title, the filename and the package name are all still matched, so every command is found by exactly what found it before.

## [Surface Routers] - 2026-08-30

### Added

- **Desktop App** on the create form — pick the native app for a service and the command becomes a surface router: it opens the app where the app is installed and the URL where it is not, so one command serves machines that differ in what they have. It takes no argument, which is what keeps it hotkey-able: Raycast raises the launcher to render an argument field, and an optional argument still prompts — it only permits an empty answer. Offered only for URL targets without a `{query}`, since `open -a` takes no query and a folder has no web surface to fall back to.

### Changed

- The detail pane lists a dropdown argument's choices rather than its placeholder. A dropdown's choices are what it actually tells you — a placeholder names the axis but not what you can pick along it.

## [Initial Version] - 2026-08-21

### Added

- **Create Link Command** — turn a URL, a folder or a search into a Script Command. Writes the header, makes it executable, and fetches the site's icon into your script directory rather than hotlinking it. `{query}` anywhere in a URL becomes a percent-encoded argument, so a search containing `&` keeps all of its terms.
- **Search Link Commands** — browse the link commands in your script directories, ordered by package so everything belonging to one service sits together. The detail pane shows the target, the application it opens in and the argument it prompts for.
- Sections by environment, and filters for environment, category and package.
- The create form offers the environments and categories already present in your own commands, with a _New…_ escape, so it teaches your vocabulary rather than imposing one.
- Package names are learned from the commands you already have: once a link to `theorchard.atlassian.net` is filed under `Jira`, the next one suggests `Jira` rather than `Atlassian`.
- Actions to run a command through its Raycast deeplink, run it in a terminal to see its output, open it in an editor, reveal it in Finder, open or copy its containing folder, duplicate it, and move it to the Trash.
- Non-executable scripts are flagged, since Raycast silently ignores them, with a Make Executable action to fix them in place.
