# Watt's Up

Check your MacBook's charger wattage, charging power, battery health and charge status — inspired by [SomeInterestingUserName/WhatWatt](https://github.com/SomeInterestingUserName/WhatWatt).

## Commands

- **Show Power and Charger Info** — list view with the negotiated power adapter wattage, voltage × current, charging status, plus battery details (charge level, power flow, health, cycle count, temperature).
- **Power Wattage in Menu Bar** — shows the negotiated wattage (e.g. `85 W`) when plugged in, or the battery charge level (e.g. `72%`) when running on battery, refreshing every minute, with details in the dropdown.
- **Show Energy Impact** — lists the apps and processes using the most energy (Activity Monitor's "energy impact" scale). Takes a one-shot ~2s `top` sample only when you launch it; nothing runs in the background.
- **Manage Energy Settings** — shows the current power source and time remaining, toggles Low Power Mode and Power Nap (macOS asks for your admin password via `pmset`), shows display/system sleep timers and which processes are currently preventing sleep.

## How it works

Reads `ioreg -rn AppleSmartBattery` and parses the `AdapterDetails` dictionary (`Watts`, `AdapterVoltage`, `Current`, `Description`) along with top-level battery keys (`CurrentCapacity`, `Voltage`, `Amperage`, `CycleCount`, `Temperature`, …).

Like the original app: this can only report what the system is *requesting* from the charger, which may not reflect actual measured values.

macOS only.
