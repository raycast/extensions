# Changelog

## [Direct Coffee-Cup Toggle] - {PR_MERGE_DATE}

- Click the coffee cup once to toggle Night Watch directly in normal states.
- Keep external ownership and transition states behind a safe recovery menu.
- Remove continuous two-second polling and redraw after completed operations.
- Release duplicate-mount suppression after one second so later clicks are not
  mistaken for the previous background refresh.

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
