# dmenu Changelog

## [Fixes & Security] - {PR_MERGE_DATE}

### Fixed
- The CLI installer now asks for confirmation before replacing an existing `~/.local/bin/dmenu` path.
- Added Store metadata screenshots for the view command.

### Security
- Replaced the unauthenticated TCP loopback socket with a Unix domain socket in a private (`0700`) temp directory, with the socket file itself set to `0600`. Previously the port was visible to any local process via `ps aux`, allowing another process to read the item list or inject a fake selection.
- Removed all logging of piped options and the selected value. Debug logging is now gated behind development mode and only ever records event names and counts (byte lengths, item counts) — never the actual content — so a Store install can no longer leave a plaintext record of what was searched for or picked at `/tmp/dmenu_ts_debug.log`.

### Fixed
- Fixed the picker never receiving your selection: the Python side closed its connection after sending the option list, then waited for a second connection that never arrived. The list and the chosen value now travel over the same connection.
- Fixed the only working setup requiring you to clone a separate repository and install its Python script by hand — the extension now bundles the exact CLI script it talks to.

### Added
- "Install Dmenu CLI" action, shown when the command is launched directly (e.g. from root search) instead of via the `dmenu` script, that copies the bundled CLI to `~/.local/bin/dmenu` and marks it executable.
- Guard for missing/invalid launch arguments, so launching the Raycast command directly shows a friendly explanation instead of crashing.

## [Initial Version] - {PR_MERGE_DATE}
