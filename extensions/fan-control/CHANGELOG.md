# Fan Control Changelog

## [Toggle Fan Speed and % of Max] - 2026-11-06

- New **Toggle Fan Speed** command: switches all fans between macOS control and full speed (or the quiet profile, set in the command preferences)
- Control Fans shows actual and target speed as % of each fan's maximum RPM next to the RPM
- Toggle Fan Speed shows the current state and what it will switch to as its subtitle (e.g. `Auto · 31% → Max`), refreshed every minute and after every change made from the extension

## [Initial Version] - 2026-08-27

- View fans with live actual/target RPM, supported range, and control mode
- Set a manual RPM target for all fans or a specific fan, validated against the hardware range
- Apply quiet/full fan profiles or return control to macOS (auto)
- Live hottest-sensor temperature in the fan list
- Graceful guidance when smctl or its daemon is not installed
