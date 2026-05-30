# Klack Changelog

## [Fix README Link] - 2026-05-20

- Fixed broken contributor GitHub link in the README

## [Stats and Standalone Support] - 2026-05-20

- Added Klack Stats view with live updates, Markdown export, and tracking-since timestamp
- Added Set Volume command with a 0–100 scrubber and custom input
- Added Turn Klack on, Turn Klack off, and Wake Klack commands
- Added support for the new Super Red switch set
- Added per-switch icons in the picker
- Added AI tools for toggle, turn on, turn off, wake up, set switch, set volume, and get status
- Added redundancy aware feedback so commands report when Klack is already in the requested state
- Added support for the standalone Klack build at tryklack.com alongside the App Store build
- Fixed Set Switch Set search to be case insensitive
- Fixed Current badge for multi-word switch names
- Fixed select action triggering before initial current switch fetch resolves
- Fixed Set Volume to Soft, Balanced, and Loud under Klack v2 by using integer volume
- Improved error toasts to distinguish not installed, needs update, and permission denied
- Improved performance via batched state reads, per-process install caching, optimistic updates, persistent cache seeding, lazy form loading, and a fix for the install check leaking a rejected promise
- Replaced run-applescript dependency with @raycast/utils runAppleScript
- Updated to @raycast/api 1.104, React 19, and TypeScript 5.9

## [Milky Yellow Support] - 2025-01-29

- Added support for the new Milky Yellow switch set

## [Cardboard Support] - 2024-07-23

– Added support for the new Cardboard switch set
– Added loading state while fetching current switch set

## [Initial Version] - 2024-05-14
