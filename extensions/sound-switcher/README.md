# Sound Switcher

Switch macOS input and output sound devices together, or control them separately from Raycast.

## Usage

Open **Sound Switcher** in Raycast to see:

- **Unified Devices**: matched input and output devices that can be switched together.
- **Outputs**: all output devices.
- **Inputs**: all input devices.

The current device in each section is shown with a green check mark. Devices are cached from the last run so the list opens quickly, then refreshes in the background.

## Troubleshooting

Sound Switcher includes a bundled macOS audio helper from [`@spotxyz/macos-audio-devices`](https://www.npmjs.com/package/@spotxyz/macos-audio-devices). No Homebrew setup is required.

If Raycast says the audio helper is missing, rebuild or reinstall the extension so the packaged helper is restored.
