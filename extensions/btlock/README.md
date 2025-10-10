# BTLock

A Raycast extension that automatically locks your Mac when a trusted Bluetooth device disconnects.

## Features

- Discover paired and connected Bluetooth devices
- Set a watcher on a specific device to monitor its connection
- Automatically lock your Mac when the watched device disconnects
- View device signal strength (RSSI) for connected devices

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` to develop locally
4. Run `npm run build` to build for production

## Usage

1. Open Raycast and search for "Bluetooth Proximity Lock"
2. Select a Bluetooth device from the list (e.g., your iPhone, Apple Watch, or headphones)
3. Choose "Set watcher for lock" to start monitoring that device
4. Your Mac will automatically lock when the device disconnects or moves out of range
5. To stop monitoring, select "Remove watcher for lock" on the same device

## Requirements

- macOS (uses built-in `system_profiler` command)
- Raycast

## License

MIT
