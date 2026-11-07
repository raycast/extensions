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
- Long-running scans and cleanups can be canceled.
- Cleanup paths must be below an approved root. Project artifacts also require an allowlisted directory name.
- Trash candidates are revalidated immediately before cleanup and rejected if they changed after the scan.
- Symlinks are not followed while calculating sizes or scanning projects.
- AI sessions, project history, credentials, configuration, plugins, Docker volumes, and active containers are outside the cleanup scope.
- fnm, rustup, Cargo, Gradle, Android, and Apple developer cache candidates are never selected by default.
- **Preselect Items** in the extension's Raycast settings controls what is selected when a scan finishes: items each tool recommends (default: stale npx workspaces, temporary AI tool data, old AI tool versions), all Safe items, Safe and Review items, or nothing. High-risk items are never preselected.
- Node and Rust versions referenced by configured projects, rustup overrides, defaults, current versions, and rollback versions are protected and shown separately.
- Kept items are excluded by their exact candidate ID from future scans, selection presets, and cleanup execution until you allow them again.

## Usage

1. On first launch, choose the project directories to scan for generated artifacts such as `node_modules` or `target`. Leave it empty to scan developer tools and caches only. You can change this later with **Configure Project Roots**.
2. Review the scan results. Each item shows its size, risk level, and whether it moves to Trash or runs a native cleanup command.
3. Select items with ⌃L and unselect them with ⌃H, or use the **Safe Items** and **Large Review Items** presets in the action panel.
4. Run **Clean Selected Items** (⌘⇧⌫) and confirm.
5. Press ⌘L to switch between the list and card views. **View Item Details** shows the full path or command.
6. Use **Keep Item (Exclude from Cleanup)** to hide an item from future scans. **Manage Kept Items** lets you allow it again.
7. **View Cleanup History** shows what was cleaned, what failed, and how much space was reclaimed. Failed items can be retried from the cleanup report.

Additional command lookup paths can be set in the extension preferences.

## Privacy

Developer Cleaner has no telemetry and performs no network requests. All scanning and cleanup happen locally on the Mac where Raycast is running.
