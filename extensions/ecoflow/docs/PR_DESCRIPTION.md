# EcoFlow

## Description

Monitor EcoFlow batteries, power stations, solar systems, smart plugs, appliances, and whole-home systems from Raycast. The extension provides normalized device status, raw readings for unknown hardware, a menu-bar summary, and a conservative set of documented controls with confirmation.

## Features

- Browse and search every device bound to an EcoFlow Developer Platform account.
- See battery, input, output, solar, grid, load, runtime, climate, and appliance readings when available.
- Inspect raw API readings for unsupported or future devices.
- Run verified controls with confirmation.
- Keep battery and power summaries in the menu bar.
- Ask Raycast AI for device discovery and current status.

## Verification

- `npm ci`
- `npm run check`
- Live read-only account test in Raycast
- No physical-device control is executed during review unless explicitly requested

## Notes for Reviewers

- Credentials use Raycast password preferences.
- Requests go only to `https://api.ecoflow.com`.
- The extension contains no analytics.
- Unknown devices and undocumented control payloads remain read-only.
