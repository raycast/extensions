# Universal Updater Changelog

## [2.0.1] - 2026-07-20

- **Polish**: Normalized command titles and preference labels for a cleaner Raycast experience
- **Polish**: Tightened README wording to match the manifest and present the extension more professionally
- **Polish**: Replaced the awkward "un-ignore" phrasing in the ignored packages view with clearer language

## [2.0.0] - 2026-07-20

- **Fix**: Critical OOM memory crash — replaced all `Promise.all` parallel shell spawns with a concurrency-limited loader (`pLimit(3)`), preventing "JS heap out of memory" errors when many ecosystems are enabled
- **Fix**: Streaming results — ecosystems now appear in the UI as soon as they finish loading, instead of waiting for all of them
- **Fix**: Unified ignore/pin LocalStorage keys — removed a duplicate `ignoredPackages` key that conflicted with the canonical `UNIVERSAL_UPDATER_IGNORED_PACKAGES` key
- **Fix**: Removed invalid `npm audit -g` flag (not a valid npm command) — now correctly audits from the global prefix directory
- **Fix**: Removed reserved Raycast shortcut (`⌘+Escape`) from "Back to Ecosystems" action
- **Fix**: `gem check` replaced with `gem environment` (gem check can hang for 10+ minutes on some systems)
- **Fix**: Go binary scan now limited to 30 binaries with 8s timeout per binary (prevents extreme slowdowns)
- **Fix**: `checkPipx()` now tries `pipx outdated` first (pipx ≥ 1.4) before falling back to list-based approach
- **Feature**: New **"Manage Ignored Packages"** command — view all ignored packages and un-ignore them
- **Feature**: Per-package upgrade action — upgrade a single package instead of the whole ecosystem
- **Feature**: Copy upgrade command to clipboard from package detail sidebar
- **Feature**: System Health now runs diagnostics in parallel with 30s timeout per check
- **Feature**: Search now supports pip (PyPI), cargo (crates.io), gem (RubyGems), and brew (local CLI) registries
- **Feature**: Search now uses AbortController to cancel stale requests + 300ms debounce
- **Feature**: Upgrade All shows numbered step progress `[2/5]` in toasts
- **Feature**: Health Score formula improved — now has 5 tiers (A+, A, B, C, D) based on outdated count
- **Feature**: Better changelog URLs for all ecosystems (versioned release pages, not generic homepages)
- **Feature**: Disk Space diagnostic added to System Diagnostics command

## [1.0.0] - 2026-07-01

- Initial release of Universal Updater featuring unified update checking for Homebrew, npm, yarn, pnpm, bun, deno, composer, pip, pipx, cargo, RubyGems, Mac App Store, and Go.
- Added "Free up Space" command to purge caches across all ecosystems.
- Added "Detect Installed Managers" rich UI dashboard.
- Added "Search Packages" with live registry autocomplete.
- Added "List Installed Packages" with interactive uninstall options.
- Added "Version Backups" command with rollback functionality.
