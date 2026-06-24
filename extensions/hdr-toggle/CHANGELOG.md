# HDR Toggle Changelog

## [Initial Version] - 2026-06-24

- List HDR-capable monitors with their current HDR state
- Toggle HDR on each monitor independently via the Win32 DisplayConfig API
- Uses the HDR-specific API (SET_HDR_STATE) on Windows 11 24H2+, with automatic fallback
  to the legacy advanced-color API on older builds
- On Windows 11 23H2 and earlier, excludes wide-color-gamut-only (non-HDR) monitors so the
  list matches the displays Windows offers an HDR toggle for
- Four assignable shortcut commands for toggling HDR on a specific monitor with a hotkey
