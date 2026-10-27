# Open Anyway Changelog

## [Initial Version] - 2026-10-27

- Initial release of Open Anyway for Raycast.
- Added automatic detection of Gatekeeper denial breadcrumbs from `syspolicyd`.
- Added native Accessibility helper with universal Mach-O binary (`arm64` and `x86_64`) for Gatekeeper approval activation.
- Integrated background launch and immediate hiding of intermediate settings surfaces.
- Preserved Apple's native confirmation dialog and Touch ID authentication flow.
- Added fallback navigation to System Settings if automated activation is not possible.
