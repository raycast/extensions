# File Provider Progress

View macOS File Provider sync activity from Raycast.

File Provider Progress shows upload, download, indexing, and health status for File Provider domains such as iCloud Drive, Synology Drive and other cloud sync providers that use Apple's File Provider system.

## What You Can See

- Current upload and download progress when byte totals are reported by the provider
- Remaining bytes in decimal and binary units
- File Provider indexing counts
- Domain health signals such as active work or required sign-in
- Provider identifiers and local root paths for troubleshooting

## Notes

Some providers do not expose byte totals for every sync operation. In those cases, the extension can still show domain health and indexing status, but upload or download rows may report that no active byte total is available.

The extension uses a bundled macOS helper to read File Provider status locally. No account credentials or cloud service tokens are required.

## Preferences

The optional CLI Path preference is intended for troubleshooting or development. Most users should leave it empty so the extension uses the bundled helper.
