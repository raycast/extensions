# Defbro Changelog

## [Dynamic defbro path detection] - 2025-08-19

- Dynamically detects defbro installation path instead of using hardcoded location
- Supports multiple installation methods (Homebrew on Intel/ARM, manual installations)
- Checks common paths: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, and others
- Uses `which` command first for faster detection
- Caches discovered path for improved performance

## [Added frecency sorting to browser list] - 2025-08-04

- Uses the built-in [useFrecencySorting hook](https://developers.raycast.com/utilities/react-hooks/usefrecencysorting) to sort browsers for convenience.

## [Initial Version] - 2024-11-19
