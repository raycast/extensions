# PIA Changelog

## [Region Browser, Favorites and Settings] - {PR_MERGE_DATE}

All existing commands keep their names and shortcuts.

### Added

- Connect to Region now shows country flags, and tags regions that support port forwarding or are geo-located
- Favorites and recently used regions
- Automatic (fastest region) entry in the region list
- Settings in the action panel: port forwarding, LAN access, and protocol
- Forwarded port shown and copyable once assigned
- New Toggle Connection command: connects when disconnected, disconnects when connected
- New Connect Most Recent command
- Setup guidance when PIA is missing, the CLI helper is not installed, or the daemon is inactive

### Changed

- Region names now come from PIA's server catalog instead of being derived from the region id, so they read correctly (for example "Sri Lanka" rather than "Srilanka")
- Status shows the VPN IP and region alongside the connection state
- Commands no longer launch the PIA app through AppleScript on every invocation
- `piactl` is located from several install paths instead of assuming `/usr/local/bin`

### Fixed

- A failed `piactl` read no longer reports the VPN as disconnected; unreadable state is now surfaced as such
- Connecting to a region only reports success once the tunnel is observed reaching that state
- A failed connection attempt no longer replaces the last successfully used region

## [More Commands] - 2023-11-23
- Updated commands to check for connectivity before showing HUD
- New command to see current status
- New command to search and connect to a specific region

## [Initial Version] - 2023-11-18
