# Tesla Changelog

## [Windows Support & Car Status] - 2026-09-21

- Added Windows to the supported platforms
- Fixed the Change Car Image picker not saving on Windows (replaced a misused `Action.SubmitForm` with a standard `Action`)
- Added a "Car Status" command: a full-width, sectioned overview of vehicle state (online/asleep/offline), activity (parked/driving with speed), battery and range, charging details, charge limit, climate (inside/outside temp), security, open doors/windows/trunks, odometer, tire pressures, software version/update, and last-updated time
- Fixed truncated Odometer, Time, and Total Range Used fields in View Drives (rounded the odometer, split the packed time into separate Time and Duration rows, and dropped the redundant "Used" prefix)
- Updated `@raycast/api`, `@raycast/utils`, and dev dependencies (`@types/react`, `@types/node`, `typescript`) to current versions

## [Flash Fix] - 2024-12-03

- Fixed screen flashing when view car command was refreshing

## [Cybertruck + QoL] - 2023-12-09

- Added Cybertruck default/white/black car image options
- Added Tire Pressure command
- Added start and stop defrost commands

## [Celsius and Kilometers Support] - 2023-11-19

- Added Celsius and Kilometers option to extension preferences

## [New Additions] - 2023-09-09

- Refactored to use the Tessie API instead of Teslascope
- Added Fart command
- Added Start/Stop Charging commands
- Added historical charges command
- Added historical drives command
- Added flash lights command
- Added ability to change car image

## [Initial Version] - 2023-08-18
