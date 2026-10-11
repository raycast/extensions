# Developer Cleaner Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Review stale Codex and Claude Code installations while protecting current and rollback versions.
- Clean package-manager caches through their native commands.
- Find Xcode DerivedData and generated artifacts inside explicitly configured project roots.
- Review every candidate before cleanup, move file-backed data to Trash, and retain local cleanup history.
- Find fnm Node.js versions, non-current Rust toolchains, Cargo caches, and Gradle/Android caches.
- Add CoreSimulator, iOS DeviceSupport, CocoaPods, and SwiftPM cache discovery.
- Discover the active pnpm store through the native CLI instead of inferring its format from the pnpm major version.
- Protect Node and Rust runtimes referenced by project pins and rustup overrides.
- Revalidate cleanup candidates, support cancellation and retry, and report measured reclaimed space.
- Normalize nested project roots and add risk filters, sorting, cleanup presets, protected-runtime inventory, and JSON reports.
- Add persistent per-item cleanup exclusions with a management view and execution-time protection.
- Add list/card view switching, clearer risk and selection indicators, and a dedicated candidate detail page.
- Redesign list views as a split layout with icon-only row accessories and a metadata side panel across candidates, history, reports, and kept items.
- Show provider brand icons from Simple Icons with light and dark variants, falling back to generic icons for Codex and project artifacts.
- Add ⌃L / ⌃H shortcuts to select and unselect the highlighted cleanup item.
