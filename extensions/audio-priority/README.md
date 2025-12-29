# Audio Priority

A Raycast extension to prioritize audio devices and automatically switch input/output based on your preferred order.

## Features

- Set a priority order for input and output devices.
- Disable devices you never want picked.
- Auto-switch input/output devices on a schedule.
- Optionally keep system sound effects in sync with the output device.

## Commands

- **Toggle Auto Switch (Input)**: Enable/disable automatic input switching.
- **Toggle Auto Switch (Output)**: Enable/disable automatic output switching.
- **Customize Device Order**: Reorder devices, disable devices, or reset to the system list.

## Preferences

- **Play sound effects through current output**: When enabled, switching the output device also updates system sound effects output.

## Development

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run build
npm run lint
```

The build/dev scripts copy the bundled `audio-devices` binary from
`@spotxyz/macos-audio-devices` into `assets/audio-devices`.

## License

MIT
