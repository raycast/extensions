# Chrome Profile Launcher Changelog

## [Initial Version] - {PR_MERGE_DATE}

- **Open Chrome Profile** command: searchable list of locally detected Chrome
  profiles with real names, emails, account photos / initials avatars, and
  actual Chrome theme colors.
- Launches the selected profile in a new Chrome window on the current macOS
  desktop via `open -n` (no Space switching).
- **Chrome Profiles Menu Bar** command: launch a profile from the menu bar
  without opening Raycast; refreshes daily in the background.
- **Launch Profile** command: launch a profile by name via an argument, plus a
  "Create Quicklink for Hotkey" action to set up per-profile global hotkeys.
- Frecency-based ordering (most-used profiles float to the top), shared between
  both commands.
- Actions: open, open incognito, reveal profile folder, copy launch command,
  refresh.
- Resilient discovery: falls back to scanning the Chrome data folder when
  `Local State` is missing or invalid; tolerates partial/malformed metadata.
- Privacy: reads only profile metadata; no history, passwords, cookies, tabs,
  network requests, or analytics.
