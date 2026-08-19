# Standing Desk for Raycast

Control an IKEA IDÅSEN standing desk from Raycast through Bluetooth Low Energy (BLE).

The extension shows the current height, stores Sit and Stand positions, moves to a target height, and stops active movement. Use it from Raycast search or as a persistent menu-bar control. Sit defaults to `70 cm`. Stand defaults to `110 cm`.

The menu opens immediately with the last reported height. Sit, Stand, Raise, and Lower run as dedicated commands with visible connection and movement progress. Use **Refresh Height** when you only want a current reading.

The extension is self-contained. It does not require Python, Bluetility, or a manually copied Bluetooth identifier.

![Standing Desk extension icon](assets/standing-desk-icon.png)

## Commands

| Command                          | Result                                               |
| -------------------------------- | ---------------------------------------------------- |
| **Standing Desk Menu**           | Opens height and controls from a menu-bar icon.      |
| **Manage Standing Desk**         | Opens the complete control view.                     |
| **Move Desk to Sit**             | Moves to the saved Sit position.                     |
| **Move Desk to Stand**           | Moves to the saved Stand position.                   |
| **Raise Desk**                   | Raises the desk by the configured step.              |
| **Lower Desk**                   | Lowers the desk by the configured step.              |
| **Stop Desk**                    | Cancels extension movement and sends a stop command. |
| **Save Current Height as Sit**   | Replaces the saved Sit position.                     |
| **Save Current Height as Stand** | Replaces the saved Stand position.                   |

The management view also supports a custom target height, settings, diagnostics, and desk selection reset.

## Requirements

- macOS with Bluetooth enabled.
- [Raycast](https://www.raycast.com/).
- An IKEA IDÅSEN or compatible LINAK desk controller.

## Install

1. Install **Standing Desk** from the Raycast Store.
2. Approve Bluetooth access when macOS asks.
3. Hold the desk Bluetooth button until its light flashes.
4. Open **Manage Standing Desk**, then open **Desk Settings** and select the desk.

Contributors can find local setup and build requirements in [Development](docs/DEVELOPMENT.md).

## First use

The first movement action for each selected desk shows a safety confirmation. Watch the desk during every movement and keep its path clear.

Open **Desk Settings** from **Manage Standing Desk**. Select the desk from the **Desk** dropdown. The extension remembers its macOS CoreBluetooth identifier for future connections.

The dropdown includes the remembered desk, compatible devices already connected to macOS, and nearby advertising devices whose names match the discovery filter. Hold the desk Bluetooth button until its light flashes, then use **Scan for Desks** when the desk is absent. Discovery does not connect to or move the desk.

Open **Desk Settings** from **Manage Standing Desk** to change:

- Desk selection and discovery name filter.
- Base, minimum, and maximum heights.
- Raise and Lower step size.

Saved Sit and Stand heights remain in Raycast local storage.

Use **Restore Default Settings** to reset the range to `62–127 cm`, the step to `1 cm`, Sit to `70 cm`, and Stand to `110 cm`. Select the desk again after restoring defaults.

Use **Diagnostic Log** to reveal the bounded extension log in Finder. The log records native command outcomes without storing the Bluetooth desk identifier.

## Safety

Software cannot detect every collision or cable problem. Keep people, furniture, cables, and loose objects clear.

Movement stops when the desk reaches its target, receives a stop request, stalls, or exceeds 45 seconds. Use the physical desk control or disconnect power if software stopping fails.

Read [Safety](docs/SAFETY.md) before changing movement logic.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) describes components, data flow, persistence, and failure boundaries.
- [Bluetooth protocol](docs/BLUETOOTH.md) documents characteristics, payloads, and height conversion.
- [Development](docs/DEVELOPMENT.md) covers setup, verification, and safe live testing.
- [Troubleshooting](docs/TROUBLESHOOTING.md) covers discovery, permissions, height calibration, and build failures.
- [Safety](docs/SAFETY.md) defines operator and contributor safeguards.

## Quick verification

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

These checks do not move the physical desk.

## Project status

The extension has connected to a real IKEA IDÅSEN controller and read its height. Automated verification covers TypeScript behavior, native height encoding, both Mac architectures, linting, type checking, and Raycast compilation.

Physical movement must remain an attended manual test.

## Protocol references

- [linak-desk-web](https://github.com/smailzhu/linak-desk-web)
- [idasen-desk-controller-mac](https://github.com/DWilliames/idasen-desk-controller-mac)

## License

[MIT](LICENSE)
