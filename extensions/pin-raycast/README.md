# Pin for Raycast

A Raycast extension for controlling [Pin.app](https://github.com/southflowpeak/Pin) from Raycast.

## About Pin.app

Pin.app is a macOS application that allows you to pin any window to stay always on top. Using mirror overlay technology, it keeps selected windows visible above all other windows.

For more details, visit the [Pin.app repository](https://github.com/southflowpeak/Pin).

## Commands

| Command | Description |
|---------|-------------|
| Pin Active Window | Pin the currently active window to stay on top |
| Unpin | Unpin the currently pinned window |
| Pin Status | Show current pin status |
| Pin Window... | Select a window from list to pin on top |
| Launch Pin Agent | Launch the Pin agent application |

## Requirements

- [Pin.app](https://github.com/southflowpeak/Pin) installed
- [Raycast](https://raycast.com/) installed

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start in development mode, or import into Raycast

## Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Run lint check
npm run lint

# Auto-fix lint issues
npm run fix-lint

# Build
npm run build
```

## License

MIT
