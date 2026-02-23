# Display Brightness Control

Control brightness for connected displays on macOS from a single Raycast command.

## Command

### Control Brightness

Shows your displays and current brightness levels, then lets you adjust brightness quickly with shortcuts or actions.

## Keyboard Controls

- `Cmd + Right Arrow`: Increase brightness by 10% for the selected display
- `Cmd + Left Arrow`: Decrease brightness by 10% for the selected display
- `Cmd + Shift + Right Arrow`: Set to `100%`
- `Cmd + Shift + Up Arrow`: Set to `50%`
- `Cmd + Shift + Left Arrow`: Set to `0%`
- `Cmd + R`: Refresh display list
- `Cmd + K`: Open action menu

## Direct Brightness Input

Use **Set Brightness** from the action menu to enter an exact percentage.

- Input must be an integer
- Valid range is `0-100`

## Requirements

This extension uses [Lunar](https://lunar.fyi/) CLI for reliable multi-display brightness control.

If Lunar is missing, use **Install Lunar** in the command empty state.

Manual setup fallback:

```bash
brew install --cask lunar
/Applications/Lunar.app/Contents/MacOS/Lunar install-cli
```

If Lunar is missing, the extension shows setup guidance and lets you copy setup commands, then retry.
