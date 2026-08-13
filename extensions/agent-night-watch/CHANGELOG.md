# Changelog

## [Fixed Live Menu Status] - {PR_MERGE_DATE}

- Fixed the steaming menu-bar icon remaining visible after normal sleep had
  already been restored.
- Added live `SleepDisabled` calibration while Raycast keeps the menu command
  loaded.

## [Fixed Lock Recovery] - {PR_MERGE_DATE}

- Fixed an abandoned toggle lock that could block both the hotkey and menu from
  disabling Night Watch.
- Added token-checked lock release and prompt stale-lock recovery.

## [Initial Version] - {PR_MERGE_DATE}

- Add a menu-bar coffee cup for closed-lid awake status.
- Add a manual toggle command suitable for a user-assigned hotkey.
- Read `SleepDisabled` as the source of truth and distinguish owned sessions
  from external sleep-disabled state.
- Require administrator authorization on enable and verify normal sleep on
  disable.
