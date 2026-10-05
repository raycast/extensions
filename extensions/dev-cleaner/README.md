# Developer Cleaner

Developer Cleaner is a local-first Raycast extension for reviewing and cleaning stale developer tools, caches, and generated project artifacts on macOS.

Nothing is removed automatically. You choose every cleanup candidate and confirm the operation before it runs.

## Cleanup Sources

- Old Codex and Claude Code installations, while preserving the current version and one rollback version
- Codex and Claude temporary staging data older than seven days
- npm cache verification and stale `npx` workspaces
- pnpm and uv native cache pruning, with the active pnpm store discovered through `pnpm store path`
- Old fnm-managed Node.js versions while preserving the default and one rollback version
- Inactive rustup toolchains and regenerable Cargo registry/Git caches
- Gradle caches, wrapper distributions, Android user cache, and SDK temporary downloads
- Optional Bun cache clearing and Homebrew cleanup
- Xcode DerivedData
- CoreSimulator, iOS DeviceSupport, CocoaPods, and SwiftPM caches
- Docker unused images and build cache; containers, networks, and volumes are preserved
- Selected `node_modules`, `.next`, `dist`, `build`, and `target` directories under configured project roots

## Safety Model

- File and directory candidates move to the macOS Trash and remain recoverable until the Trash is emptied.
- Package-manager, Homebrew, and Docker cleanup commands permanently remove their own data.
- Native commands are executed directly without a shell.
- Native command output is streamed into a bounded buffer, and long-running cleanup can be canceled.
- Cleanup paths must be below an approved root. Project artifacts also require an allowlisted directory name.
- Trash candidates are revalidated immediately before cleanup and rejected if they changed after the scan.
- Symlinks are not followed while calculating sizes or scanning projects.
- AI sessions, project history, credentials, configuration, plugins, Docker volumes, and active containers are outside the cleanup scope.
- fnm, rustup, Cargo, Gradle, Android, and Apple developer cache candidates are never selected by default.
- Node and Rust versions referenced by configured projects, rustup overrides, defaults, current versions, and rollback versions are protected and shown separately.
- Kept items are excluded by their exact candidate ID from future scans, selection presets, and cleanup execution until you allow them again.

## Development

Requires Node.js 24 LTS and Raycast for macOS.

```fish
npm install
npm run dev
npm test
npm run test:coverage
npm run typecheck
npm run lint
npm run build
```

The first launch offers an optional directory picker for project artifacts. Additional command lookup paths can be configured in the extension preferences.

Project scanning is optional. Continue without selecting a directory to scan developer tools and caches only. Scan results appear progressively and an in-progress scan can be canceled from the action panel.

Project roots are canonicalized and nested roots are collapsed to avoid duplicate scans. Selecting the entire home directory requires an explicit warning confirmation.

Candidates appear in a split list by default: compact rows with cleanup-method, risk, and selection icons on the left, and a metadata panel on the right showing the description, footprint, risk, cleanup method, source, last-modified date, selection state, location, and native command. Use **Show Cards** in an item's action panel (⌘L) to switch to a five-column card view; the same action switches back to the list. Search, risk filtering, selection, and sorting work in both views. Press ⌃L to select the highlighted item and ⌃H to unselect it; for ⌃J/⌃K up/down movement, enable Vim-style navigation bindings in Raycast Settings. **View Item Details** opens a full page with the untruncated description and path or command. Cleanup history, cleanup reports, and kept items use the same split layout. Items show their tool's brand icon (from [Simple Icons](https://simpleicons.org), CC0) where one exists. The navigation title summarizes selected items and their known footprint.

Candidates can be sorted by size, age, or name, and selected with safe or large-review presets. Completed operations are recorded in a local cleanup history with per-item success, failure, cancellation, current-footprint, and measured-reclaim details. Failed items can be retried from the immediate cleanup report, and reports can be copied as text or JSON.

Use **Keep Item (Exclude from Cleanup)** on a candidate to hide it from both views and prevent it from being selected or cleaned on later scans. Open **Manage Kept Items** from the action panel to review saved exclusions and choose **Allow Cleanup Again** when you want an item to reappear. Exclusions apply to individual candidates, not entire providers or parent directories.

Displayed cache sizes represent the current footprint. Native tools determine how much is reclaimable; Developer Cleaner measures the before/after difference when the managed cache path remains available. Items moved to Trash report zero immediate reclaimed space until Trash is emptied.

## Privacy

Developer Cleaner has no telemetry and performs no network requests. All scanning and cleanup happen locally on the Mac where Raycast is running.
