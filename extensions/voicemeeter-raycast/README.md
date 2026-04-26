# Voicemeeter Control

Control Voicemeeter strips and buses from Raycast on Windows.

## Requirements

- **Windows** (Voicemeeter is Windows-only)
- [Voicemeeter](https://vb-audio.com/Voicemeeter/) installed and running
- Raycast

## Commands

- **Mute Channels**: Toggle, mute, or unmute strips and buses with selectable stale-state behavior
- **Adjust Volume**: Quick step controls and absolute dB input
- **Manage Connections**: Connect or disconnect strips to each available bus
- **Manage Profiles**: Create and apply global presets with per-target overrides
- **View Status**: Connection status and current mute/volume snapshot

## Setup

1. Install and run Voicemeeter (Basic, Banana, or Potato).
2. Add the extension in Raycast and configure preferences if needed.
3. Use in-command Quick Settings to adjust mute behavior, undo TTL, and executable path.

## Preferences

- **Mute Behavior**: How mute actions behave when state may be stale (optimistic toggle, refresh then toggle, or explicit idempotent)
- **Undo TTL**: Seconds until undo expires
- **Voicemeeter Executable Path**: Path to Voicemeeter for launch actions (e.g. `C:\Program Files\VB\Voicemeeter\voicemeeter8.exe`)
- **Volume Steps**: dB values for increase/decrease
- **Section Order**: Strips first or buses first in lists

## Notes

- Uses the Voicemeeter Remote API via native bindings (koffi). No background daemon required.
