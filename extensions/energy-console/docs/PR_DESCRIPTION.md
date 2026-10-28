# Energy Console

## Description

Energy Console is an unofficial community extension for compatible EcoFlow batteries, power stations, solar systems, smart plugs, appliances, and whole-home systems. It provides normalized device status, raw readings for unknown hardware, a menu-bar summary, and documented controls with confirmation. It is not affiliated with or endorsed by EcoFlow.

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
- Each user supplies their own Developer Platform access and secret keys. Requests go directly from their Mac to `https://api.ecoflow.com`, with no shared server.
- The extension contains no analytics.
- Unknown devices and undocumented control payloads remain read-only.
- The extension uses an independent, generic icon; no EcoFlow logo or other brand asset is included.
