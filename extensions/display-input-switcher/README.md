# Display Input Switcher

Switch your external monitor's input source (HDMI, DisplayPort, USB-C) directly from Raycast on Apple Silicon Macs.

Powered by [m1ddc](https://github.com/waydabber/m1ddc), a DDC/CI tool for controlling external displays connected via USB-C/DisplayPort Alt Mode.

## Commands

### Switch Input Source

Pick an input source from a dropdown (HDMI 1, HDMI 2, DisplayPort 1, DisplayPort 2, USB-C) and switch to it immediately. Shows a confirmation dialog with a "Don't ask again" option.

If the monitor is already on the selected input, it shows a success toast instead.

### Preview Input Source

Temporarily switch to an input source to test it. A countdown toast shows the remaining time, with actions to:

- **Cancel Preview** — switch back immediately
- **Confirm Switch** — keep the input and save the previous one for toggling

Default duration is 10 seconds. You can set a custom duration via the optional "Duration in Seconds" argument.

### Toggle Input Source

Instantly toggle between the current input source and the previously selected one. Requires using "Switch Input Source" at least once to establish a history.

## Requirements

- Apple Silicon Mac (M1/M2/M3/M4)
- External display connected via USB-C or DisplayPort Alt Mode
- [m1ddc](https://github.com/waydabber/m1ddc) — auto-installed via Homebrew if not found

## Future Ideas

These are capabilities supported by [m1ddc](https://github.com/waydabber/m1ddc) that could be added in the future:

- **Multiple display support** — target specific displays by ID or UUID
- **Display settings control** — brightness, contrast, volume, color gain, mute, PIP/PBP
- **Windows and Intel Mac support** — currently requires Apple Silicon; could support other platforms via alternative DDC/CI tools
