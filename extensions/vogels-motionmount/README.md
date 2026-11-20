# Vogel's MotionMount

Control your Vogel's MotionMount motorized TV mount from Raycast over Bluetooth.

> This is an unofficial extension. It is not affiliated with, endorsed by or supported by Vogel's.

## Features

- **Move to Preset**: move the TV to the wall or to any preset stored on the mount, and add, edit or delete presets. Presets are stored on the MotionMount itself, so they stay in sync with the official app.
- **Remote Control**: move the TV step by step with ⌘ + arrow keys, send it to the wall, or enter an exact distance (0 to 100) and rotation (-100 left to 100 right).
- **Run Diagnostics**: run the MotionMount self-test. The mount moves from side to side and reports whether it works correctly.

## Supported models

Tested with the **MotionMount NEXT 7355**. Other models that use the same Bluetooth protocol may work. The SIGNATURE series (TVM 7675) uses a different protocol and is not supported.

## Setup

1. Make sure your Mac has Bluetooth turned on and is within range of the MotionMount.
2. The first time you run a command, macOS asks whether Raycast may use Bluetooth. Click **Allow**.
3. If you dismissed the prompt, enable Raycast in **System Settings → Privacy & Security → Bluetooth**.

## Good to know

- Each command opens a fresh Bluetooth connection, which takes a few seconds. Presets and the last known position are cached, so lists appear instantly and refresh in the background.
- When you move to a preset, Raycast closes right away and the mount keeps moving in the background.
- The mount accepts a single Bluetooth connection at a time.

## Troubleshooting

- **MotionMount not found**: close the official app on your phone, since the mount accepts only one Bluetooth connection at a time.
- **You replaced your MotionMount**: the extension only connects to the mount it found first, so it never moves a neighbor's TV by mistake. Use **Forget Saved MotionMount** to connect to the new one.
- **The TV stops before reaching its position**: this can happen after a lot of movement in a short time. Let the mount rest for a while and avoid running diagnostics repeatedly.
- **The MotionMount is in bootloader mode**: the mount is waiting for a firmware update. Power cycle it and, if that does not help, update its firmware with the official app.
