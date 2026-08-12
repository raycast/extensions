# Watchkey Changelog

## [Windows Support] - 2026-04-12

- Added cross-platform Windows support via watchkey-win CLI with Windows Hello authentication
- Platform-aware binary path resolution with fallback for sandboxed environments
- Import Key command shows "not available" message on Windows
- Update check and install guard point to correct platform-specific GitHub repo

## [Selection Lists & Update Key] - 2026-04-06

- Get Key and Delete Key now display a searchable list of saved keys instead of requiring manual text input
- Added new Update Key command for updating existing secrets
- Keys are enumerated from the macOS keychain automatically

## [Initial Release] - 2026-03-31

- Set, get, delete, and import keychain secrets via Raycast
- Touch ID & Apple Watch authentication via watchkey CLI
