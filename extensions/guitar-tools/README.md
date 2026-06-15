# Guitar Tools

A Raycast extension that provides tools that guitarists use in separate applications.

## Features

- Start a chromatic tuner directly from Raycast
- Select your preferred audio input device (useful for audio interfaces and external sound cards)

### Future Features

- Guitar fretboard practice tool

## Requirements

- [Sox](https://sox.sourceforge.net/) - Sound processing program
  - Install with Homebrew: `brew install sox`

## Usage

### Tuner

1. Open Raycast and search for "Chromatic Tuner"
2. Run the command
3. Play a note on your instrument and follow the icons to tune up or down

### Using an External Audio Interface

1. While in a command that uses audio input, press `Cmd+K` to open the Action Panel
2. Select "Select Audio Input Device"
3. Choose your preferred audio input device (e.g., audio interface, sound card)
4. The command will now use the selected device

## Troubleshooting

- If you encounter issues with the tuner, make sure Sox is installed: `brew install sox`
- Ensure your microphone permissions are enabled for Raycast
- If your audio interface is not detected, try unplugging and reconnecting it
