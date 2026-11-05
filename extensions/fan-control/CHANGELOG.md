# Fan Control Changelog

## [Toggle Fan Speed and % of Max] - {PR_MERGE_DATE}

- New **Toggle Fan Speed** command: switches all fans between macOS control and full speed (or the quiet profile, set in the command preferences)
- Control Fans shows actual and target speed as % of each fan's maximum RPM next to the RPM

## [Initial Version] - 2026-08-27

- View fans with live actual/target RPM, supported range, and control mode
- Set a manual RPM target for all fans or a specific fan, validated against the hardware range
- Apply quiet/full fan profiles or return control to macOS (auto)
- Live hottest-sensor temperature in the fan list
- Graceful guidance when smctl or its daemon is not installed
