# EcoFlow for Raycast

Monitor EcoFlow devices from Raycast, keep battery status in the menu bar, and run a conservative set of documented controls. The extension uses EcoFlow's official developer API and stores credentials in Raycast preferences.

This is an unofficial community extension. It is not affiliated with, endorsed by, or sponsored by EcoFlow. EcoFlow and its product names are trademarks of their respective owner.

## What it does

- **Device Dashboard:** Search and filter every device bound to your developer account. See online state, battery level, power flow, input, output, solar, grid, load, runtime, battery limits, and device-specific operating details when available.
- **Device Detail:** Open a normalized status view or inspect every raw quota returned by EcoFlow. Unknown devices remain useful through the raw-readings view.
- **Safe Controls:** Run controls only for device families whose current public payloads are implemented. Every change requires confirmation.
- **Menu Bar:** See the lowest online battery level and open a quick device summary without launching Raycast first.
- **Raycast AI:** Ask for device discovery and status in natural language. Physical changes use a confirmation-enabled AI tool.

## Device coverage

The catalog is checked against all 17 product families in EcoFlow's current public API navigation. Every bound device remains visible. Documented families get normalized telemetry, legacy families use compatible telemetry aliases, and unknown or future hardware falls back to raw, read-only readings when EcoFlow returns them.

| Category             | Public API family          | Monitoring | Verified controls                                          |
| -------------------- | -------------------------- | ---------- | ---------------------------------------------------------- |
| 🏠 Home Battery      | PowerOcean                 | Normalized | Read-only                                                  |
| ☀️ Solar             | PowerStream Micro Inverter | Normalized | Supply priority, custom load, battery limits               |
| 🏠 Home Battery      | STREAM                     | Normalized | AC outlets on documented BK11 and BK41 models              |
| 🔋 Power Station     | DELTA 3 Max Plus           | Normalized | AC, AC 2, 12V, battery limits, buzzer                      |
| 🔋 Power Station     | DELTA 3 Max                | Normalized | AC, 12V, battery limits, buzzer                            |
| 🔋 Power Station     | DELTA Pro                  | Normalized | AC, DC, battery limits, buzzer                             |
| 🔋 Power Station     | DELTA Pro Ultra            | Normalized | AC, DC, battery limits on Y711 models                      |
| 🔋 Power Station     | DELTA Pro 3                | Normalized | High- and low-voltage AC, 12V, battery limits, buzzer      |
| 🔋 Power Station     | RIVER 2 Pro                | Normalized | AC, 12V, battery limits                                    |
| 🔋 Power Station     | DELTA 2 Max                | Normalized | AC, 12V, battery limits                                    |
| 🔋 Power Station     | DELTA 2                    | Normalized | AC, 12V, battery limits                                    |
| ⚡️ Whole-Home System | Smart Home Panel 2         | Normalized | Read-only                                                  |
| ⚡️ Whole-Home System | Smart Home Panel           | Normalized | EPS mode, backup battery limits                            |
| 🚐 Power Kit         | Power Kits                 | Normalized | Battery limits                                             |
| 🔌 Smart Plug        | Smart Plug                 | Normalized | Power, indicator brightness                                |
| ❄️ Appliance         | GLACIER                    | Normalized | Temperature, eco mode, ice maker, buzzer                   |
| ❄️ Appliance         | WAVE Air Conditioner       | Normalized | Power, mode, preset, fan, temperature, light strip, buzzer |

Legacy compatibility covers DELTA Max, DELTA mini, RIVER 2, RIVER 2 Max, RIVER Pro, and the DCBP serial prefix for DELTA Pro Ultra. Other EcoFlow devices are identified as generic devices and stay read-only.

Read-only is deliberate. The extension does not guess payloads for physical devices.
Smart Home Panel 2 monitoring uses the current public fields, but its HTTP control section is still marked
"Coming soon" by EcoFlow, so whole-home controls remain disabled.

## Setup

1. Create an application in the [EcoFlow Developer Platform](https://developer-eu.ecoflow.com/).
2. Install or start the extension in Raycast.
3. Enter the access key and secret key when Raycast opens the extension preferences. Both fields use Raycast's password preference type.
4. Open **View Devices**.

Do not paste credentials into issues, chat messages, screenshots, source files, or commits. EcoFlow's device-list endpoint returns devices bound directly to the account, not devices shared by another account.

## Privacy and network access

- Access and secret keys use Raycast password preferences.
- Requests go only to EcoFlow's signed API at `https://api.ecoflow.com`.
- The extension contains no analytics or third-party tracking.
- AI tool responses mask serial numbers and never return credentials.
- Device controls require confirmation before a request is sent.

## Commands

| Command         | Purpose                                                |
| --------------- | ------------------------------------------------------ |
| View Devices    | Browse and filter all devices                          |
| Open Device     | Open one device by name or serial number               |
| Control Device  | Choose from online devices with verified controls      |
| Menu Bar Status | Show battery and power summaries in the macOS menu bar |

## Raycast AI examples

- "List my EcoFlow devices."
- "What is the battery level of my garage battery?"
- "How much power is my DELTA taking in and putting out?"
- "Which controls are available for my WAVE?"
- "Set my WAVE to 22 degrees."

Raycast asks for confirmation before the last example can change the device.

## Development

```bash
npm ci
npm run typecheck
npm test
npm run lint
npm run build
```

The API layer is split into a signed HTTP client, quota normalization, declarative device profiles, normalized status extraction, verified command builders, and a testable service layer. Regression tests include EcoFlow's published signature vector and current flat heartbeat examples.

## API references

- [EcoFlow General Information](https://developer-eu.ecoflow.com/us/document/root?id=2058828162669383681)
- [EcoFlow product API documentation](https://developer-eu.ecoflow.com/us/document/introduction)
