# App Uninstaller Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Lists applications installed in `/Applications`, `/Applications/Utilities` and `~/Applications`, with bundle sizes
- Views the list by size band or by how long ago each app was last used, so the ones worth reclaiming lead
- Scans ~30 macOS locations for caches, containers, preferences, launch agents and privileged helpers
- Groups findings as Certain / Likely / Unsure, with the reason shown on every row
- Moves approved items to the Trash; never deletes outright, and escalates only when you choose to and authenticate
- Detects root-owned bundles, as App Store apps are, and removes the ones you select through the macOS authentication dialog
- Asks for the App Management and Full Disk Access permissions up front, reports each one live, and closes itself once both are granted (reopen with `⌘⇧P`)
- Warns when another process is running code from a bundle, which blocks its removal, and offers to quit it
- Explains and retries anything macOS refused to remove
- Detects Homebrew casks, vendor uninstallers and installer receipts, and points at the better tool
