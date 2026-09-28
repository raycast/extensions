# DriveWay Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Save, mount, and unmount multiple network drives over **SMB** and **WebDAV**, each with an optional alias and username. A **WebDAV (insecure, no TLS)** option is available for a trusted local network whose server has no valid certificate.
- **Network Discovery** finds servers on your local network through three independently toggled sources: Bonjour/mDNS browsing, an active subnet scan that confirms WebDAV with an RFC 4918 `OPTIONS` capability check rather than just an open port, and a ping sweep that lists any reachable device regardless of protocol. SMB hosts expand into their individual shares; WebDAV and presence-only hosts appear at the host level.
- **Discover Devices** runs that discovery as its own command, with a Refresh action to re-scan on demand.
- **Manage Drives** lists saved drives with live connection status and disk usage, plus **Browse Shares on This Host…** for one-time-credential share discovery on any saved SMB host.
- **Mount All** and **Unmount All** act on every saved drive at once.
- **Auto-Reconnect** silently reconnects only the drives you opt in, on a configurable interval, and never unmounts anything.
- **DriveWay Menu Bar** shows saved drives and their status outside Raycast, with one-click mount and unmount.
- Mounting goes through AppleScript's `mount volume`, the same mechanism Finder's Connect to Server uses, so a cached Keychain credential connects silently and a self-signed WebDAV certificate can be trusted interactively. No Automation permission is required and no password is stored by the extension.
- AFP is not offered: Apple removed AFP client support in macOS 27, with no CLI or AppleScript fallback.
