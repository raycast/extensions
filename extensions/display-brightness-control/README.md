# Display Brightness Control

Control brightness for all active displays connected to your Mac from one Raycast command.

## Command

### Control Brightness

Shows connected active displays and their current brightness levels.

## Keyboard Controls

- `Cmd + Right Arrow`: Increase brightness by 10% for the selected display
- `Cmd + Left Arrow`: Decrease brightness by 10% for the selected display
- `Cmd + K`: Open the action menu with:
  - Increase Brightness
  - Decrease Brightness
  - Set Brightness (0-100)

## Direct Brightness Input

Use **Set Brightness** from the action menu to enter an exact percentage.

- Input must be an integer
- Valid range is `0-100`

## Lunar Dependency

This extension uses [Lunar](https://lunar.fyi/) CLI for reliable multi-display brightness control.

If Lunar is missing, use **Install Lunar** in the command empty state.

Manual setup fallback:

```bash
brew install --cask lunar
/Applications/Lunar.app/Contents/MacOS/Lunar install-cli
```

If Lunar is missing, the extension shows setup guidance and lets you copy setup commands, then retry.
