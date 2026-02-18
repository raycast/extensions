# Temp Check

Monitor your Mac's CPU temperature in real time from Raycast.

## Features

- **Menu Bar Display** — Live CPU temperature with color-coded severity in the macOS menu bar
- **Detail View** — Full breakdown of all thermal die sensors, chip model, core count, and status
- **Celsius / Fahrenheit Toggle** — Switch units instantly with `Cmd+U` or from the menu bar dropdown. Your preference persists across sessions.
- **Configurable Thresholds** — Set custom warning and critical temperature thresholds in extension preferences

## Understanding Die Sensors vs CPU Cores

Your Mac's chip has multiple thermal sensors embedded in the silicon die. The number of die sensors does **not** match the number of CPU cores — for example, an Apple M4 Max has 14 CPU cores but 10 die sensors. Die sensors measure temperature across different zones of the chip, not individual cores.

Temp Check shows:
- **Average** — Mean temperature across all die sensors
- **Maximum** — Hottest sensor reading
- **Individual Sensors** — Each die sensor's current temperature

## Temperature Status

| Status   | Default Range | Color  |
|----------|---------------|--------|
| Normal   | Below 65°C    | Green  |
| Warm     | 65–79°C       | Yellow |
| Hot      | 80–94°C       | Orange |
| Critical | 95°C+         | Red    |

Thresholds are configurable in extension preferences.

## GPU Temperature

On Apple Silicon Macs, the GPU shares the same die as the CPU (unified architecture). A separate GPU temperature is not exposed by the hardware. The CPU die sensor readings cover the entire chip including the GPU.

## Requirements

- macOS (Apple Silicon recommended)
- Xcode Command Line Tools (for building the temperature reader binary)

## How It Works

Temp Check reads thermal sensor data using macOS IOKit HID APIs through a lightweight native binary compiled from source (`tools/temp-reader.m`). No sudo or special permissions required. The binary is compiled automatically as a universal binary (arm64 + x86_64) when you build the extension.
