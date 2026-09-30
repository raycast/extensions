# SVGO Changelog

## [OXVG provider & SVGO v4] - 2026-06-29

- Add **Optimization Provider** preference to choose between SVGO (default) and OXVG (experimental, faster on large SVGs)
- Upgrade to SVGO v4 and update `@raycast/api` and `is-svg` dependencies
- Show OXVG provider status and guidance in `Configure SVGO` when OXVG is selected
- Fall back to SVGO automatically if OXVG optimization fails
- Fix `removeScripts` plugin ID for SVGO v4 compatibility
- Closes #29020

## [Enhance some commands] - 2025-04-15

- Added live preview to `Configure SVGO`
- Added file sizes (before, after) to `Optimize SVG string` success message

## [New Configuration] - 2025-04-08

- Added ability to modify (`save`, `restore`) configuration for all commands
- Upgraded plugins to latest versions: `@raycast/api`, `svgo`

## [New Command] - 2023-06-06

- Added new command to create optimized SVG files based on the current Finder selection
- Refactored original command to close Raycast window
- Added preference setting to allow pasting the optimized string to the frontmost application

## [SVGO Extension] - 2022-08-10

- Added SVGO extension
