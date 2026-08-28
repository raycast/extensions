# WinSCP Changelog

## [Registry Sessions, Protocols and Workspace Fixes] - 2026-07-14

### Session discovery

- Added support for sessions stored in the Windows registry, which is WinSCP's default storage location. Registry sessions are read through PowerShell rather than `reg.exe`, which is often blocked on managed machines
- Added support for `WinSCP.ini` in `%APPDATA%`, the default INI location that was previously never read
- WinSCP is now detected in `Program Files`, on `PATH`, and in package-manager installs such as Scoop and Chocolatey

### Session list

- Workspaces are now listed once instead of once per contained session, with a session count in the subtitle
- Session subtitles now show the protocol (e.g. `sftp://user@host`) instead of `undefined@host` when no username is set
- Workspaces use a distinct icon in the list
- Added an empty state when no sessions are found

### Launching sessions

- Sessions are now launched with their stored identifier, so names with spaces or other encoded characters open correctly
- Sessions are launched directly instead of through a shell command
- Added a **Launch in New Instance** action (`⌘⇧↩`)
- Added a **Refresh Sessions** action (`⌘R`)

### Error handling

- Improved the "WinSCP Not Found" message and added a preference shortcut to set the installation folder manually
- Added a dedicated error view when registry sessions cannot be read, with steps to switch WinSCP to INI storage

## [Fixed Session Parsing] - 2025-11-14

- Fixed parsing of WinSCP.ini to correctly extract session names
- Added support for workspace sessions (e.g., "Media/0000", "My Workspace/0000")
- Added support for regular sessions (e.g., "user@host")
- Sessions with URL-encoded names (e.g., "My%20Workspace") are now properly decoded
- Improved regex patterns to handle different session name formats
