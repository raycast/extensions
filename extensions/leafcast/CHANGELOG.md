# Leafcast Changelog

## [Pairing, AI Tools, and Quick Commands] - 2026-05-23

### Added

- AI tools for controlling your panels via Raycast AI — say things like "@leafcast turn the lights off", "set them to a warm orange", or "switch to Northern Lights at 40%".
- **Identify Device** command that briefly flashes the panels — handy for confirming which device is paired. Also available as an AI tool and as an action on the pairing success screen.
- Five hotkey-bindable no-view commands: Toggle Power, Next Effect, Previous Effect, Brightness Up (+10%), Brightness Down (-10%).
- Multi-device discovery — when more than one Nanoleaf is found on the network, a picker is shown so you can choose which to pair with.

### Changed

- Network scanning now uses mDNS (Bonjour) instead of an ARP-table lookup, so it works whether or not the device has been recently active on the network.
- The Pair Device command auto-scans your network when it opens — no need to trigger the scan manually.
- Pairing instructions are now inline on the pair screen instead of a separate confirmation modal.
- Pairing failures now show a specific reason ("Device isn't in pairing mode", "Connection timed out", etc.) instead of a generic error.

### Fixed

- IPv4 validation no longer accepts malformed addresses or behaves inconsistently across repeated submissions.
- Auto-filled addresses from the network scan now clear stale validation errors immediately.
- Pairing no longer silently succeeds when the device responds without an auth token — it surfaces a clear error instead.

## [Initial Version] - 2023-10-13
