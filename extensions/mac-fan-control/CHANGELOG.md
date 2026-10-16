# Mac Fan Control Changelog

## [Cool until below] - {PR_MERGE_DATE}

- New **Cool Until Below** command: hold a speed (maximum by default) until the hottest sensor drops below a chosen temperature, then release the fans to firmware — runs in the background
- Fan Status and the menu bar show the active cooldown and can cancel it

## [Initial Version] - {PR_MERGE_DATE}

- Show live fan speed, control mode and CPU/GPU temperature
- Force every fan to a percentage of its own hardware RPM range
- Apply maximum speed or hand all fans back to SMC firmware control in one keystroke
- Menu bar command with current RPM, temperatures and quick actions
