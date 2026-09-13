# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - {PR_MERGE_DATE}

### Added
- **Copy as File Link** command — copies selected Finder items as `file:///` URLs to the clipboard
- **Copy as File Link (Front Finder Window)** command — copies the frontmost Finder window's folder as a `file:///` link
- Multi-selection support (one link per line)
- Optional POSIX paths argument (newline-separated) for automation/scripting
- Percent-encoding via Node's `pathToFileURL` for spaces, special characters, and Unicode
- Desktop fallback when no Finder window is open
- Generated 512×512 RGBA extension icon

### Fixed
- Argument path-splitting now uses newlines instead of whitespace, correctly handling paths with spaces (common on macOS)