# Kitty Raycast Extension Changelog

## [Update] - 2026-03-30

### Fixed

- Kitten binary path is no longer hardcoded to `/Applications/kitty.app/Contents/MacOS/kitten`. The extension now auto-detects the binary from PATH, standard macOS locations, and Homebrew paths.
- Process detection (`pgrep`) now works for Kitty installations outside `/Applications`.

### Added

- New **Kitten Path** preference to manually override the path to the `kitten` binary.

## [Initial Version] - 2026-02-24

- New Kitty Window command
- New Kitty Tab command
- Search Kitty Tabs command
- Open Kitty Launch Configuration command (YAML-based multi-tab/split layouts)
- Open with Kitty command (open Finder folder in Kitty)
