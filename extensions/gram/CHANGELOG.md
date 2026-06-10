# Gram Changelog

## [Fix Non-POSIX Shell Support] - 2026-06-05

- Fix projects silently failing to open when the user's default shell is non-POSIX (nushell, elvish, xonsh, pwsh, ...) by falling back to `/bin/zsh` for the `env -i ... -lc` invocation. Previously only fish was handled this way.
- Surface CLI launch failures via a toast in the single-folder open action so future regressions don't fail silently.
- from [PR #28027](https://github.com/raycast/extensions/pull/28027)

## [New Commands & Fixes] - 2026-06-04

### Added
- **'Manage Extensions' Command:** Allows users to search for, install, uninstall, update, or downgrade (to a user-selected version) extensions for Gram. Includes the ability to ignore updates to certain extensions.
- **'Background Updates' Command:** Grants users the choice to set up auto-updates for installed Gram extensions or to update them manually.

### Changed
- Renamed the **Open with Gram** command to **Open in Gram** and updated its subtitles to be more descriptive.
- Renamed the **Search Recent Projects** command to **Search & Open Recent Projects**.
- Updated applicable screenshots in the `metadata/` folder.

### Fixed
- Resolved a bug where opening a project via the recent projects menu required navigating to Raycast's main menu and back again for the "Open" badge and associated actions to appear in the UI.


## [Initial Version] - 2026-05-11
