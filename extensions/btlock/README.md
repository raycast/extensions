# BTLock

A Raycast extension that automatically locks your Mac when a trusted Bluetooth device moves out of range.

![BTLock Screenshot](./metadata/btlock-1.png)

## Features

- Discover paired and connected Bluetooth devices
- Set a watcher on a specific device to monitor its proximity
- Automatically lock your Mac when the watched device exceeds proximity threshold (-70 dB)
- View device signal strength (RSSI) for connected devices
- Background proximity checks every 10 seconds

## Installation

### From Raycast Store
Search for "BTLock" in the Raycast Store and install.

### Development
1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` to develop locally
4. Run `npm run build` to build for production

## Usage

1. Open Raycast and search for "Bluetooth Proximity Lock"
2. Select a Bluetooth device from the list (e.g., your iPhone, Apple Watch, or headphones)
3. Choose "Set Watcher for Lock" to start monitoring that device
4. Your Mac will automatically lock when the device's signal strength drops below -70 dB (approximately 10-15 meters)
5. To stop monitoring, select "Remove Watcher for Lock" on the same device

![Action Menu](./metadata/btlock-2.png)

## Requirements

- macOS (uses built-in `system_profiler` command)
- Raycast

## License

MIT
