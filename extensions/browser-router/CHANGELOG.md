# Browser Router Changelog

## [v1.1] - 2026-09-28

- Added **Smart Profile Sorting** with 4 modes: Alphabetical (A → Z), Reverse Alphabetical (Z → A), Most Frequently Used (MRU with launch tracking), and Custom Order.
- Added interactive **Custom Profile Reordering Layout** with live position rank badges (`#1`, `#2`, `#3`) and keyboard controls (`Alt + Up/Down`, `Ctrl + Shift + Up/Down`, `Reset to Alphabetical`).
- Hardened CLI launcher with safe quote escaping to prevent tab-splitting on double-quoted queries and URLs.
- Enhanced URL resolution to intelligently differentiate programming keywords (e.g. `react.js`, `node.js`, `vue.js`) from web domains.
- Added strict IPv4 0-255 octet range validation.
- Added real-time disk validation in the Custom Profile form to prevent saving invalid or mistyped `.exe` paths.
- Added in-memory caching for Windows registry and MSIX package scans for instantaneous profile loading.
- Added visual indicators for favorite profiles (⭐) and custom registered profiles (Purple badge) in unified views.
- Updated comprehensive User Manual with new keyboard shortcuts, screenshots, and sorting documentation.

## [Initial Release] - 2026-09-25

- Initial release of Browser Router for Windows.
- Route search queries and URLs directly from Raycast to any installed browser and profile.
- Deep profile persistence for Chrome, Microsoft Edge, Brave, Vivaldi, Arc, Opera, and Mozilla Firefox.
- In-place friendly profile renaming and custom display names.
- Custom and portable browser profile registration.
- Privacy-first local architecture with built-in user guide and feedback support.
