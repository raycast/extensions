# Mac Fan Control Changelog

## [Thermal Trigger] - {PR_MERGE_DATE}

- New **Thermal Trigger** command: arm a hysteresis thermostat that spins the fans to a chosen
  speed at a trigger temperature and hands them back to firmware below a release temperature,
  with the sensor group (hottest die, CPU or GPU) configurable
- Fan Status and the menu bar show whether a trigger is armed or holding, and can cancel it

## [Initial Version] - 2026-11-17

- Show live fan speed, control mode and CPU/GPU temperature
- Force every fan to a percentage of its own hardware RPM range
- Cool Until Below: hold a speed until the hottest sensor drops below a temperature, then release the fans to firmware
- Apply maximum speed or hand all fans back to SMC firmware control in one keystroke
- Menu bar command with current RPM, temperatures, any active cooldown, and quick actions
