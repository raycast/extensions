# Lid Awake Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Keep a Mac awake with the lid closed (`pmset -a disablesleep`)
- Commands: Set up Lid Awake, Keep Awake with Lid Closed, Allow Sleep, Toggle Lid Awake, menu bar item
- Type a custom duration in Keep Awake with Lid Closed, such as `45m`, `1h30` or `2.5h`
- The menu bar lists your recent custom durations, and Custom Duration… opens the command to type a new one
- Auto-off when the timer ends, when the battery drops below the cutoff, or after a restart
- One-time setup installs a narrow sudoers rule so toggling needs no password
