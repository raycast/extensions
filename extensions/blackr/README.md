# Blackr

Blackr is a simple Raycast extension for quick screen cleaning on macOS and Windows. Run it from Raycast to cover your main display with a black screen, making dust, fingerprints, and smudges easier to see before wiping the display.

## Usage

1. Open Raycast.
2. Type `blackr`.
3. Press Enter.
4. Clean the screen while it stays black.
5. Click `Exit`, press `Esc`, or wait for the configured duration.

## Preferences

The default cleaning duration is `60` seconds. You can change it from the Blackr command preferences in Raycast.

Blackr accepts durations from `10` to `600` seconds. Empty or invalid values fall back to `60` seconds.

## Behavior

- Covers the main display only.
- Shows a subtle `Exit` button near the bottom center.
- Exits when you click `Exit`, press `Esc`, or reach the configured duration.
- Exits automatically after the configured duration.
- Does not turn off the display or change brightness.
- Does not collect data, access the network, or store user content.

## Platform Support

- macOS uses a small native Swift overlay.
- Windows uses a packaged PowerShell and WinForms overlay.

## Why Blackr?

A black screen makes dust and fingerprints easier to spot, while the timer keeps the cleaning session temporary. It is designed for quick, low-friction use when you want to clean your display without changing system settings.
