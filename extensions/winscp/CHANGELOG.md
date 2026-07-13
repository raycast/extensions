# WinSCP Changelog

## [Registry Sessions, Protocols and Workspace Fixes] - {PR_MERGE_DATE}

- Added support for sessions stored in the registry, which is where WinSCP keeps them by default. They are read through PowerShell's registry provider rather than `reg.exe`, which is often blocked by policy on managed machines
- Added support for the `WinSCP.ini` in `%APPDATA%`, which previously was never read even though it is the default INI location
- Added detection of WinSCP installed in `Program Files` or through a package manager such as Scoop or Chocolatey
- Sessions are now launched with their stored identifier, so sessions whose name contains spaces or other encoded characters open correctly
- Session subtitles now show the protocol (`sftp://user@host`) and no longer show `undefined@host` for sessions without a user name
- Workspaces are now listed once instead of once per session they contain
- Added a "Launch in New Instance" action and a "Refresh Sessions" action
- Sessions are now launched without going through a shell

## [Fixed Session Parsing] - 2025-11-14

- Fixed parsing of WinSCP.ini to correctly extract session names
- Added support for workspace sessions (e.g., "Media/0000", "My Workspace/0000")
- Added support for regular sessions (e.g., "user@host")
- Sessions with URL-encoded names (e.g., "My%20Workspace") are now properly decoded
- Improved regex patterns to handle different session name formats
