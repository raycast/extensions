# Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Add a menu-bar coffee cup for closed-lid awake status.
- Add a manual toggle command suitable for a user-assigned hotkey.
- Read `SleepDisabled` as the source of truth and distinguish owned sessions
  from external sleep-disabled state.
- Require administrator authorization on enable and verify normal sleep on
  disable.
