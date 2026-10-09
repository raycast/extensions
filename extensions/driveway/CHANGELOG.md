# DriveWay Changelog

## [Initial Version] - 2026-10-09

- Save, mount, and unmount any number of network drives over SMB and WebDAV, each with an optional alias and username
- WebDAV (insecure, no TLS) option for a trusted local network whose server has no valid certificate
- Manage Drives: saved drives with live connection status and disk usage, plus connect, disconnect, edit, and remove, and a separate section for network drives that are mounted without being saved
- Browse Shares on This Host: lists an SMB host's shares using credentials entered once, for that host only, with the password left empty on servers that list without one
- Discover Devices: finds servers on the local network via Bonjour/mDNS, a subnet scan, and a ping sweep, each toggled independently
- Subnet scan confirms WebDAV with an RFC 4918 `OPTIONS` check rather than just an open port
- An SMB host expands into its shares only when it can be listed without a password, so no stored credential is sent to a machine you didn't name
- Mount All and Unmount All act on every saved drive at once, skipping any already connected
- Auto-Reconnect reconnects only the drives you opt in, on a configurable interval, and never unmounts anything
- Menu bar command with saved drives, their status, and one-click mount and unmount, plus anything mounted but not saved, and an option to count those in the number beside the icon
- Mounting uses AppleScript's `mount volume`, the same mechanism as Finder's Connect to Server, so a cached Keychain credential connects silently and a self-signed WebDAV certificate can be trusted interactively
- No Automation permission required and no password stored by the extension
- AFP is not offered: Apple removed AFP client support in macOS 27, with no CLI or AppleScript fallback
